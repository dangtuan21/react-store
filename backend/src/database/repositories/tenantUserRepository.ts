import MongooseRepository from './mongooseRepository';
import AuditLogRepository from './auditLogRepository';
import User from '../models/user';
import Roles from '../../security/roles';
import crypto from 'crypto';
import { IRepositoryOptions } from './IRepositoryOptions';

/**
 * Handles database operations for Tenant User Roles.
 * See https://mongoosejs.com/docs/index.html to learn how to customize it.
 */
export default class TenantUserRepository {
  /**
   * Finds the Tenant User by its invitation token
   */
  static async findByInvitationToken(
    invitationToken,
    options: IRepositoryOptions,
  ) {
    let user = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findOne({
          tenants: { $elemMatch: { invitationToken } },
        })
        .populate('tenants.tenant'),
      options,
    );

    if (!user) {
      return null;
    }

    user = user.toObject ? user.toObject() : user;

    const tenantUser = user.tenants.find((userTenant) => {
      return userTenant.invitationToken === invitationToken;
    });

    return {
      ...tenantUser,
      user,
    };
  }

  /**
   * Creates the Tenant User relation.
   * @param {*} tenant
   * @param {*} user
   * @param {*} options
   */
  static async create(tenant, user, roles, options: IRepositoryOptions) {
    roles = roles || [];
    const status = selectStatus('active', roles);

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateMany(
        { _id: user.id },
        {
          $push: {
            tenants: {
              tenant: tenant.id,
              status,
              roles,
            },
          },
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: user.id,
        action: AuditLogRepository.CREATE,
        values: {
          email: user.email,
          status,
          roles,
        },
      },
      options,
    );
  }

  /**
   * Deletes the user from the tenant.
   *
   * @param {*} tenantId
   * @param {*} id
   * @param {*} options
   */
  static async destroy(tenantId, id, options: IRepositoryOptions) {
    const user = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).findById(id),
      options,
    );

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          $pull: {
            tenants: { tenant: tenantId },
          },
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: user.id,
        action: AuditLogRepository.DELETE,
        values: {
          email: user.email,
        },
      },
      options,
    );
  }

  /**
   * Updates the roles of the user in a tenant.
   *
   * @param {*} id
   * @param {*} roles
   * @param {*} [options]
   */
  static async updateRoles(tenantId, id, roles, options) {
    const user = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .populate('tenants.tenant'),
      options,
    );

    let tenantUser = user.tenants.find((userTenant) => {
      return userTenant.tenant.id === tenantId;
    });

    let isCreation = false;

    if (!tenantUser) {
      isCreation = true;
      tenantUser = {
        tenant: tenantId,
        status: selectStatus('invited', []),
        invitationToken: crypto
          .randomBytes(20)
          .toString('hex'),
        roles: [],
      };

      await MongooseRepository.wrapWithSessionIfExists(
        User(options.database).updateOne(
          { _id: id },
          {
            $push: {
              tenants: tenantUser,
            },
          },
        ),
        options,
      );
    }

    let { roles: existingRoles } = tenantUser;

    let newRoles = [] as Array<string>;

    if (options.addRoles) {
      newRoles = [...new Set([...existingRoles, ...roles])];
    } else if (options.removeOnlyInformedRoles) {
      newRoles = existingRoles.filter(
        (existingRole) => !roles.includes(existingRole),
      );
    } else {
      newRoles = roles || [];
    }

    tenantUser.roles = newRoles;
    tenantUser.status = selectStatus(
      tenantUser.status,
      newRoles,
    );

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id, 'tenants.tenant': tenantId },
        {
          $set: {
            'tenants.$.roles': newRoles,
            'tenants.$.status': tenantUser.status,
          },
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: user.id,
        action: isCreation
          ? AuditLogRepository.CREATE
          : AuditLogRepository.UPDATE,
        values: {
          email: user.email,
          status: tenantUser.status,
          roles: newRoles,
        },
      },
      options,
    );

    return tenantUser;
  }

  static async acceptInvitation(invitationToken, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    // This tenant user includes the User data
    let invitationTenantUser = await this.findByInvitationToken(
      invitationToken,
      options,
    );

    let existingTenantUser = currentUser.tenants.find(
      (userTenant) =>
        String(userTenant.tenant.id) ===
        String(invitationTenantUser.tenant.id),
    );

    // destroys old invite just for sure
    await this.destroy(
      invitationTenantUser.tenant.id,
      invitationTenantUser.user.id,
      options,
    );

    const tenantUser = {
      tenant: invitationTenantUser.tenant.id,
      invitationToken: null,
      status: selectStatus(
        'active',
        invitationTenantUser.roles,
      ),
      roles: invitationTenantUser.roles,
    };

    // In case the user is already a member, should merge the roles
    if (existingTenantUser) {
      // Merges the roles from the invitation and the current tenant user
      tenantUser.roles = [
        ...new Set([
          ...existingTenantUser.roles,
          ...invitationTenantUser.roles,
        ]),
      ];
    }

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: currentUser.id },
        {
          $push: {
            tenants: tenantUser,
          },
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: currentUser.id,
        action: AuditLogRepository.UPDATE,
        values: {
          email: currentUser.email,
          roles: tenantUser.roles,
          status: selectStatus('active', tenantUser.roles),
        },
      },
      options,
    );
  }
}

function selectStatus(oldStatus, newRoles) {
  newRoles = newRoles || [];

  if (oldStatus === 'invited') {
    return oldStatus;
  }

  if (!newRoles.length) {
    return 'empty-permissions';
  }

  return 'active';
}

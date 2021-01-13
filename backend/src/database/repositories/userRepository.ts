import MongooseRepository from './mongooseRepository';
import User from '../models/user';
import AuditLogRepository from './auditLogRepository';
import MongooseQueryUtils from '../utils/mongooseQueryUtils';
import FileRepository from './fileRepository';
import crypto from 'crypto';
import Error404 from '../../errors/Error404';
import SettingsRepository from './settingsRepository';
import { isUserInTenant } from '../utils/userTenantUtils';
import { IRepositoryOptions } from './IRepositoryOptions';

/**
 * Handles database operations for Users.
 * See https://mongoosejs.com/docs/index.html to learn how to customize it.
 */
export default class UserRepository {
  /**
   * Creates a user.
   */
  static async create(data, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    data = this._preSave(data);

    const [user] = await User(options.database).create(
      [
        {
          email: data.email,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          fullName: data.fullName || null,
          phoneNumber: data.phoneNumber || null,
          importHash: data.importHash || null,
          avatars: data.avatars || [],
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        },
      ],
      MongooseRepository.getSessionOptionsIfExists(options),
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: user.id,
        action: AuditLogRepository.CREATE,
        values: user,
      },
      options,
    );

    return this.findById(user.id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  /**
   * Creates the user based on the auth information.
   *
   * @param {*} data
   * @param {*} [options]
   */
  static async createFromAuth(data, options: IRepositoryOptions) {
    data = this._preSave(data);

    let [user] = await User(options.database).create(
      [
        {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          fullName: data.fullName,
        },
      ],
      MongooseRepository.getSessionOptionsIfExists(options),
    );

    delete user.password;
    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: user.id,
        action: AuditLogRepository.CREATE,
        values: user,
      },
      options,
    );

    return this.findById(user.id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  /**
   * Updates the password of the user.
   *
   * @param {*} id
   * @param {*} password
   * @param {*} [options]
   */
  static async updatePassword(id, password, invalidateOldTokens: boolean, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    const data: any = {
      password,      
      updatedBy: currentUser.id,
    }

    if (invalidateOldTokens) {
      data.jwtTokenInvalidBefore = new Date();
    }

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        data,
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: {
          id,
          password: 'secret',
        },
      },
      options,
    );

    return this.findById(id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  /**
   * Updates the profile of the user.
   *
   * @param {*} id
   * @param {*} data
   * @param {*} [options]
   */
  static async updateProfile(id, data, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    data = this._preSave(data);

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          fullName: data.fullName || null,
          phoneNumber: data.phoneNumber || null,
          updatedBy: currentUser.id,
          avatars: data.avatars || [],
        },
      ),
      options,
    );

    const user = await this.findById(id, options);

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: user,
      },
      options,
    );

    return user;
  }

  /**
   * Generates the email verification token.
   *
   * @param {*} email
   * @param {*} [options]
   */
  static async generateEmailVerificationToken(
    email,
    options: IRepositoryOptions,
  ) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    const { id } = await this.findByEmailWithoutAvatar(
      email,
      options,
    );

    const emailVerificationToken = crypto
      .randomBytes(20)
      .toString('hex');
    const emailVerificationTokenExpiresAt =
      Date.now() + 24 * 60 * 60 * 1000;

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          emailVerificationToken,
          emailVerificationTokenExpiresAt,
          updatedBy: currentUser.id,
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: {
          id,
          emailVerificationToken,
          emailVerificationTokenExpiresAt,
        },
      },
      options,
    );

    return emailVerificationToken;
  }

  /**
   * Generates the password reset token.
   *
   * @param {*} email
   * @param {*} [options]
   */
  static async generatePasswordResetToken(email, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    const { id } = await this.findByEmailWithoutAvatar(
      email,
      options,
    );

    const passwordResetToken = crypto
      .randomBytes(20)
      .toString('hex');
    const passwordResetTokenExpiresAt =
      Date.now() + 24 * 60 * 60 * 1000;

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          passwordResetToken,
          passwordResetTokenExpiresAt,
          updatedBy: currentUser.id,
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: {
          id,
          passwordResetToken,
          passwordResetTokenExpiresAt,
        },
      },
      options,
    );

    return passwordResetToken;
  }

  /**
   * Updates a user.
   *
   * @param {*} id
   * @param {*} data
   * @param {*} [options]
   */
  static async update(id, data, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    data = this._preSave(data);

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          fullName: data.fullName || null,
          phoneNumber: data.phoneNumber || null,
          updatedBy: currentUser.id,
          avatars: data.avatars || [],
        },
      ),
      options,
    );

    const user = await this.findById(id, options);

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: user,
      },
      options,
    );

    return user;
  }

  /**
   * Finds the user by email.
   *
   * @param {*} email
   * @param {*} [options]
   */
  static async findByEmail(email, options: IRepositoryOptions) {
    const record = await this.findByEmailWithoutAvatar(
      email,
      options,
    );
    return await this._fillRelationsAndFileDownloadUrls(
      record,
      options,
    );
  }

  /**
   * Find the user by email, but without fetching the avatar.
   *
   * @param {*} email
   * @param {*} [options]
   */
  static async findByEmailWithoutAvatar(email, options: IRepositoryOptions) {
    return MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findOne({ email })
        .populate('tenants.tenant'),
      options,
    );
  }

  /**
   * Finds the user based on the query.
   *
   * @param {Object} query
   * @param {Object} query.filter
   * @param {number} query.limit
   * @param  {number} query.offset
   * @param  {string} query.orderBy
   *
   * @returns {Promise<Object>} response - Object containing the rows and the count.
   */
  static async findAndCountAll(
    { filter, limit = 0, offset = 0, orderBy = '' },
    options: IRepositoryOptions,
  ) {
    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    let criteriaAnd: any = [];

    criteriaAnd.push({
      tenants: { $elemMatch: { tenant: currentTenant.id } },
    });

    if (filter) {
      if (filter.id) {
        criteriaAnd.push({
          ['_id']: MongooseQueryUtils.uuid(filter.id),
        });
      }

      if (filter.fullName) {
        criteriaAnd.push({
          ['fullName']: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.fullName,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.email) {
        criteriaAnd.push({
          ['email']: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.email,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.role) {
        criteriaAnd.push({
          tenants: { $elemMatch: { roles: filter.role } },
        });
      }

      if (filter.status) {
        criteriaAnd.push({
          tenants: {
            $elemMatch: { status: filter.status },
          },
        });
      }

      if (filter.createdAtRange) {
        const [start, end] = filter.createdAtRange;

        if (
          start !== undefined &&
          start !== null &&
          start !== ''
        ) {
          criteriaAnd.push({
            ['createdAt']: {
              $gte: start,
            },
          });
        }

        if (
          end !== undefined &&
          end !== null &&
          end !== ''
        ) {
          criteriaAnd.push({
            ['createdAt']: {
              $lte: end,
            },
          });
        }
      }
    }

    const sort = MongooseQueryUtils.sort(
      orderBy || 'createdAt_DESC',
    );

    const skip = Number(offset || 0) || undefined;
    const limitEscaped = Number(limit || 0) || undefined;
    const criteria = criteriaAnd.length
      ? { $and: criteriaAnd }
      : null;

    let rows = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .find(criteria)
        .skip(skip)
        .limit(limitEscaped)
        .sort(sort)
        .populate('tenants.tenant'),
      options,
    );

    const count = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).countDocuments(criteria),
      options,
    );

    rows = this._mapUserForTenantForRows(
      rows,
      currentTenant,
    );
    rows = await Promise.all(
      rows.map((row) =>
        this._fillRelationsAndFileDownloadUrls(
          row,
          options,
        ),
      ),
    );

    return { rows, count };
  }

  /**
   * Lists the users to populate the autocomplete.
   *
   * @param {Object} search
   * @param {number} limit
   */
  static async findAllAutocomplete(search, limit, options: IRepositoryOptions) {
    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    let criteria: any = {
      tenants: { $elemMatch: { tenant: currentTenant.id } },
    };

    if (search) {
      criteria = {
        ...criteria,
        $or: [
          {
            _id: MongooseQueryUtils.uuid(search),
          },
          {
            fullName: {
              $regex: MongooseQueryUtils.escapeRegExp(
                search,
              ),
              $options: 'i',
            },
          },
          {
            email: {
              $regex: MongooseQueryUtils.escapeRegExp(
                search,
              ),
              $options: 'i',
            },
          },
        ],
      };
    }

    const sort = MongooseQueryUtils.sort('fullName_ASC');
    const limitEscaped = Number(limit || 0) || undefined;

    let users = await User(options.database)
      .find(criteria)
      .limit(limitEscaped)
      .sort(sort);

    users = this._mapUserForTenantForRows(
      users,
      currentTenant,
    );

    const buildText = (user) => {
      if (!user.fullName) {
        return user.email;
      }

      return `${user.fullName} <${user.email}>`;
    };

    return users.map((user) => ({
      id: user.id,
      label: buildText(user),
    }));
  }

  static async findByIdWithPassword(id, options: IRepositoryOptions) {
    return await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .populate('tenants.tenant'),
      options,
    );
  }

  /**
   * Finds the user and all its relations.
   *
   * @param {string} id
   * @param {Object} [options]
   */
  static async findById(id, options: IRepositoryOptions) {
    let record = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .populate('tenants.tenant'),
      options,
    );

    if (!record) {
      throw new Error404();
    }

    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    if (!options || !options.bypassPermissionValidation) {
      if (!isUserInTenant(record, currentTenant.id)) {
        throw new Error404();
      }

      record = this._mapUserForTenant(
        record,
        currentTenant,
      );
    }

    record = await this._fillRelationsAndFileDownloadUrls(
      record,
      options,
    );

    return record;
  }

  /**
   * Finds the user password
   *
   * @param {string} id
   * @param {Object} [options]
   */
  static async findPassword(id, options: IRepositoryOptions) {
    let record = await MongooseRepository.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .select('+password'),
      options,
    );

    if (!record) {
      return null;
    }

    return record.password;
  }

  /**
   * Finds the user, without fetching the avatar.
   *
   * @param {string} id
   * @param {Object} [options]
   */
  static async findByIdWithoutAvatar(id, options: IRepositoryOptions) {
    return this.findById(id, options);
  }

  /**
   * Finds the user by the password token if not expired.
   *
   * @param {*} token
   * @param {*} [options]
   */
  static async findByPasswordResetToken(token, options: IRepositoryOptions) {
    return MongooseRepository.wrapWithSessionIfExists(
      User(options.database).findOne({
        passwordResetToken: token,
        passwordResetTokenExpiresAt: { $gt: Date.now() },
      }),
      options,
    );
  }

  /**
   * Finds the user by the email verification token if not expired.
   *
   * @param {*} token
   * @param {*} [options]
   */
  static async findByEmailVerificationToken(
    token,
    options: IRepositoryOptions,
  ) {
    return MongooseRepository.wrapWithSessionIfExists(
      User(options.database).findOne({
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: {
          $gt: Date.now(),
        },
      }),
      options,
    );
  }

  /**
   * Marks the user email as verified.
   *
   * @param {*} id
   * @param {*} [options]
   */
  static async markEmailVerified(id, options: IRepositoryOptions) {
    const currentUser = MongooseRepository.getCurrentUser(
      options,
    );

    await MongooseRepository.wrapWithSessionIfExists(
      User(options.database).updateOne(
        { _id: id },
        {
          emailVerified: true,
          updatedBy: currentUser.id,
        },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'user',
        entityId: id,
        action: AuditLogRepository.UPDATE,
        values: {
          emailVerified: true,
        },
      },
      options,
    );

    return true;
  }

  /**
   * Counts the users based on the filter.
   *
   * @param {*} [filter]
   * @param {*} [options]
   */
  static async count(filter, options: IRepositoryOptions) {
    return MongooseRepository.wrapWithSessionIfExists(
      User(options.database).countDocuments(filter),
      options,
    );
  }

  /**
   * Normalize the user fields.
   *
   * @param {*} data
   */
  static _preSave(data) {
    if (data.firstName || data.lastName) {
      data.fullName = `${(data.firstName || '').trim()} ${(
        data.lastName || ''
      ).trim()}`.trim();
    }

    data.email = data.email ? data.email.trim() : null;

    data.firstName = data.firstName
      ? data.firstName.trim()
      : null;

    data.lastName = data.lastName
      ? data.lastName.trim()
      : null;

    return data;
  }

  /**
   * Maps the users data to show only the current tenant related info
   *
   * @param {*} rows
   * @param {*} tenant
   */
  static _mapUserForTenantForRows(rows, tenant) {
    if (!rows) {
      return rows;
    }

    return rows.map((record) =>
      this._mapUserForTenant(record, tenant),
    );
  }

  /**
   * Maps the user data to show only the current tenant related info
   *
   * @param {*} user
   * @param {*} tenant
   */

  static _mapUserForTenant(user, tenant) {
    if (!user || !user.tenants) {
      return user;
    }

    const tenantUser = user.tenants.find(
      (tenantUser) =>
        tenantUser &&
        tenantUser.tenant &&
        String(tenantUser.tenant.id) === String(tenant.id),
    );

    delete user.tenants;

    const status = tenantUser ? tenantUser.status : null;
    const roles = tenantUser ? tenantUser.roles : [];

    // If the user is only invited,
    // tenant members can only see its email
    const otherData =
      status === 'active' ? user.toObject() : {};

    return {
      ...otherData,
      id: user.id,
      email: user.email,
      roles,
      status,
    };
  }

  static async _fillRelationsAndFileDownloadUrls(
    record,
    options: IRepositoryOptions,
  ) {
    if (!record) {
      return null;
    }

    const output = record.toObject
      ? record.toObject()
      : record;

    if (output.tenants && output.tenants.length) {
      await Promise.all(
        output.tenants.map(async (userTenant) => {
          userTenant.tenant.settings = await SettingsRepository.find(
            {
              currentTenant: userTenant.tenant,
              ...options,
            },
          );
        }),
      );
    }

    output.avatars = await FileRepository.fillDownloadUrl(
      output.avatars,
    );

    return output;
  }
}

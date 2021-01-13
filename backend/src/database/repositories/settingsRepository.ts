import MongooseRepository from './mongooseRepository';
import Settings from '../models/settings';
import AuditLogRepository from './auditLogRepository';
import FileRepository from './fileRepository';
import { IRepositoryOptions } from './IRepositoryOptions';

/**
 * Handles database operations for Settings.
 * See https://mongoosejs.com/docs/index.html to learn how to customize it.
 */
export default class SettingsRepository {
  /**
   * Finds the settings.
   *
   * @param {*} defaults
   * @param {*} [options]
   */
  static async find(options: IRepositoryOptions) {
    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    return this._fillFileDownloadUrls(
      await MongooseRepository.wrapWithSessionIfExists(
        Settings(options.database).findOne({
          tenant: currentTenant.id,
        }),
        options,
      ),
    );
  }

  /**
   * Finds the settings or creates and returns the default.
   *
   * @param {*} defaults
   * @param {*} [options]
   */
  static async findOrCreateDefault(defaults, options: IRepositoryOptions) {
    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    const first = await MongooseRepository.wrapWithSessionIfExists(
      Settings(options.database).findOne({
        tenant: currentTenant.id,
      }),
      options,
    );

    if (first) {
      return this._fillFileDownloadUrls(first);
    }

    const [settings] = await Settings(
      options.database,
    ).create(
      [
        {
          ...defaults,
          tenant: currentTenant.id,
          createdBy: MongooseRepository.getCurrentUser(
            options,
          )
            ? MongooseRepository.getCurrentUser(options).id
            : null,
        },
      ],
      MongooseRepository.getSessionOptionsIfExists(options),
    );

    return this._fillFileDownloadUrls(settings);
  }

  /**
   * Saves the settings.
   *
   * @param {*} data
   * @param {*} [options]
   */
  static async save(data, options: IRepositoryOptions) {
    const currentTenant = MongooseRepository.getCurrentTenant(
      options,
    );

    const record = await MongooseRepository.wrapWithSessionIfExists(
      Settings(options.database).findOne({
        tenant: currentTenant.id,
      }),
      options,
    );

    await MongooseRepository.wrapWithSessionIfExists(
      Settings(options.database).updateOne(
        { _id: record.id },
        { ...data, tenant: currentTenant.id },
      ),
      options,
    );

    await AuditLogRepository.log(
      {
        entityName: 'settings',
        entityId: record.id,
        action: AuditLogRepository.UPDATE,
        values: data,
      },
      options,
    );

    return this._fillFileDownloadUrls(
      await MongooseRepository.wrapWithSessionIfExists(
        Settings(options.database).findById(record.id),
        options,
      ),
    );
  }

  static async _fillFileDownloadUrls(record) {
    if (!record) {
      return null;
    }

    const output = record.toObject
      ? record.toObject()
      : record;

    output.logos = await FileRepository.fillDownloadUrl(
      output.logos,
    );

    output.backgroundImages = await FileRepository.fillDownloadUrl(
      output.backgroundImages,
    );

    return output;
  }
}

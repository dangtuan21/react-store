import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * Customer database schema.
 * See https://mongoosejs.com/docs/models.html to learn how to customize it.
 */
export default (database) => {
  try {
    return database.model('customer');
  } catch (error) {
    // continue, because model doesnt exist
  }

  const CustomerSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 255,
      },
      birthdate: {
        type: String,
      },
      gender: {
        type: String,
        enum: [
          "male",
          "female",
          null
        ],
      },
      tenant: {
        type: Schema.Types.ObjectId,
        ref: 'tenant',
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      importHash: { type: String },
    },
    { timestamps: true },
  );

  CustomerSchema.index(
    { importHash: 1, tenant: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  

  CustomerSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  CustomerSchema.set('toJSON', {
    getters: true,
  });

  CustomerSchema.set('toObject', {
    getters: true,
  });

  return database.model('customer', CustomerSchema);
};

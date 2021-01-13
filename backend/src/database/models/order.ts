import mongoose from 'mongoose';
import FileSchema from './schemas/fileSchema';
const Schema = mongoose.Schema;

/**
 * Order database schema.
 * See https://mongoosejs.com/docs/models.html to learn how to customize it.
 */
export default (database) => {
  try {
    return database.model('order');
  } catch (error) {
    // continue, because model doesnt exist
  }

  const OrderSchema = new Schema(
    {
      customer: {
        type: Schema.Types.ObjectId,
        ref: 'customer',
        required: true,
      },
      products: [{
        type: Schema.Types.ObjectId,
        ref: 'product',
        required: true,
        min: 1,
      }],
      employee: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      delivered: {
        type: Boolean,
        default: false
      },
      attachments: [FileSchema],
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

  OrderSchema.index(
    { importHash: 1, tenant: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  

  OrderSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  OrderSchema.set('toJSON', {
    getters: true,
  });

  OrderSchema.set('toObject', {
    getters: true,
  });

  return database.model('order', OrderSchema);
};

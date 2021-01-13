import mongoose from 'mongoose';
import FileSchema from './schemas/fileSchema';
const Schema = mongoose.Schema;

/**
 * Product database schema.
 * See https://mongoosejs.com/docs/models.html to learn how to customize it.
 */
export default (database) => {
  try {
    return database.model('product');
  } catch (error) {
    // continue, because model doesnt exist
  }

  const ProductSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 255,
      },
      description: {
        type: String,
        maxlength: 21845,
      },
      unitPrice: {
        type: Number,
        required: true,
        min: 0.01,
        max: 99999,
      },
      photos: [FileSchema],
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

  ProductSchema.index(
    { importHash: 1, tenant: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  

  ProductSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  ProductSchema.set('toJSON', {
    getters: true,
  });

  ProductSchema.set('toObject', {
    getters: true,
  });

  return database.model('product', ProductSchema);
};

import schemas from 'src/modules/shared/yup/yupImporterSchemas';
import { i18n } from 'src/i18n';

export default [
  {
    name: 'customer',
    label: i18n('entities.order.fields.customer'),
    schema: schemas.relationToOne(
      i18n('entities.order.fields.customer'),
      {
        "required": true
      },
    ),
  },
  {
    name: 'products',
    label: i18n('entities.order.fields.products'),
    schema: schemas.relationToMany(
      i18n('entities.order.fields.products'),
      {
        "required": true,
        "min": 1
      },
    ),
  },
  {
    name: 'employee',
    label: i18n('entities.order.fields.employee'),
    schema: schemas.relationToOne(
      i18n('entities.order.fields.employee'),
      {},
    ),
  },
  {
    name: 'delivered',
    label: i18n('entities.order.fields.delivered'),
    schema: schemas.boolean(
      i18n('entities.order.fields.delivered'),
      {},
    ),
  },
  {
    name: 'attachments',
    label: i18n('entities.order.fields.attachments'),
    schema: schemas.files(
      i18n('entities.order.fields.attachments'),
      {
        "max": 3
      },
    ),
  },
];
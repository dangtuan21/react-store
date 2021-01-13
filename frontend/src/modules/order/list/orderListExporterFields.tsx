import { i18n } from 'src/i18n';
import exporterRenders from 'src/modules/shared/exporter/exporterRenders';

export default [
  {
    name: 'id',
    label: i18n('entities.order.fields.id'),
  },
  {
    name: 'customer',
    label: i18n('entities.order.fields.customer'),
    render: exporterRenders.relationToOne(),
  },
  {
    name: 'products',
    label: i18n('entities.order.fields.products'),
    render: exporterRenders.relationToMany(),
  },
  {
    name: 'employee',
    label: i18n('entities.order.fields.employee'),
    render: exporterRenders.relationToOne(),
  },
  {
    name: 'delivered',
    label: i18n('entities.order.fields.delivered'),
    render: exporterRenders.boolean(),
  },
  {
    name: 'attachments',
    label: i18n('entities.order.fields.attachments'),
    render: exporterRenders.filesOrImages(),
  },
  {
    name: 'createdAt',
    label: i18n('entities.order.fields.createdAt'),
    render: exporterRenders.datetime(),
  },
  {
    name: 'updatedAt',
    label: i18n('entities.order.fields.updatedAt'),
    render: exporterRenders.datetime(),
  },
];

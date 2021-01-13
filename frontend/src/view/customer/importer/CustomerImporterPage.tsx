import React from 'react';
import { i18n } from 'src/i18n';
import actions from 'src/modules/customer/importer/customerImporterActions';
import fields from 'src/modules/customer/importer/customerImporterFields';
import selectors from 'src/modules/customer/importer/customerImporterSelectors';
import ContentWrapper from 'src/view/layout/styles/ContentWrapper';
import Breadcrumb from 'src/view/shared/Breadcrumb';
import importerHoc from 'src/view/shared/importer/Importer';
import PageTitle from 'src/view/shared/styles/PageTitle';

function CustomerImportPage() {
  const Importer = importerHoc(
    selectors,
    actions,
    fields,
    i18n('entities.customer.importer.hint'),
  );

  return (
    <>
      <Breadcrumb
        items={[
          [i18n('dashboard.menu'), '/'],
          [i18n('entities.customer.menu'), '/customer'],
          [i18n('entities.customer.importer.title')],
        ]}
      />

      <ContentWrapper>
        <PageTitle>
          {i18n('entities.customer.importer.title')}
        </PageTitle>

        <Importer />
      </ContentWrapper>
    </>
  );
}

export default CustomerImportPage;

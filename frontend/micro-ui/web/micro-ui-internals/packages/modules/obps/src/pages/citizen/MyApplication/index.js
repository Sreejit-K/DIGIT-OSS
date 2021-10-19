import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, KeyNote, Loader, SubmitBar, Header } from "@egovernments/digit-ui-react-components";
import { Fragment } from "react";
import { Link, useHistory } from "react-router-dom";

const getServiceType = () => {
  return `BPA_APPLICATIONTYPE_BUILDING_PLAN_SCRUTINY`
}

const MyApplication = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [bpaFilters, setBpaFilters] = useState({ limit: -1, offset: 0 });
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const { data, isLoading } = Digit.Hooks.obps.useBPAREGSearch(tenantId);
  const { data: bpaData, isLoading: isBpaSearchLoading } = Digit.Hooks.obps.useBPASearch(tenantId, {});

  const getBPAREGFormData = (data) => {
    let license = data;
    let intermediateData = {
      "Correspondenceaddress":license?.tradeLicenseDetail?.owners?.[0]?.correspondenceAddress || `${license?.tradeLicenseDetail?.address?.doorNo ? `${license?.tradeLicenseDetail?.address?.doorNo}, ` : ""} ${license?.tradeLicenseDetail?.address?.street ? `${license?.tradeLicenseDetail?.address?.street}, ` : ""}${
        license?.tradeLicenseDetail?.address?.landmark ? `${license?.tradeLicenseDetail?.address?.landmark}, ` : ""
      }${t(license?.tradeLicenseDetail?.address?.locality.code)}, ${t(license?.tradeLicenseDetail?.address?.city?license?.tradeLicenseDetail?.address?.city.code:"")},${t(license?.tradeLicenseDetail?.address?.pincode) ? `${license.tradeLicenseDetail?.address?.pincode}` : " "}`,
      "formData":{
        "LicneseDetails":{
          "PanNumber":license?.tradeLicenseDetail?.owners?.[0]?.pan,
          "PermanentAddress":license?.tradeLicenseDetail?.owners?.[0]?.permanentAddress,
          "email":license?.tradeLicenseDetail?.owners?.[0]?.emailId,
          "gender":{code:license?.tradeLicenseDetail?.owners?.[0]?.gender, i18nKey:`COMMON_GENDER_${license?.tradeLicenseDetail?.owners?.[0]?.gender}`,value:license?.tradeLicenseDetail?.owners?.[0]?.gender},
          "mobileNumber":license?.tradeLicenseDetail?.owners?.[0]?.mobileNumber,
          "name":license?.tradeLicenseDetail?.owners?.[0]?.name,
        },
        "LicneseType":{
          LicenseType:{i18nKey:`TRADELICENSE_TRADETYPE_${license?.tradeLicenseDetail?.tradeUnits?.[0]?.tradeType.split(".")[0]}`, role:[`BPA_${license?.tradeLicenseDetail?.tradeUnits?.[0]?.tradeType.split(".")[0]}`],tradeType:license?.tradeLicenseDetail?.tradeUnits?.[0]?.tradeType},
          ArchitectNo:license?.tradeLicenseDetail?.additionalDetail?.counsilForArchNo || null,
        }
      },
      "isAddressSame":license?.tradeLicenseDetail?.owners?.[0]?.correspondenceAddress === license?.tradeLicenseDetail?.owners?.[0]?.permanentAddress ? true : false,
      "result":{
        Licenses:[{...data}],
      }
    };

    sessionStorage.setItem("BPAREGintermediateValue",JSON.stringify(intermediateData));
    history.push("/digit-ui/citizen/obps/stakeholder/apply/stakeholder-docs-required");
  }

  if (isLoading || isBpaSearchLoading) {
    return <Loader />
  }

  return (
    <Fragment>
      <Header>{`${t("BPA_MY_APPLICATIONS")} (${data?.Licenses?.length})`}</Header>
      {data?.Licenses?.map((application, index) => (
        <Card key={index}>
          <KeyNote keyValue={t("BPA_LICENSE_TYPE")} note={t(`TRADELICENSE_TRADETYPE_${application?.tradeLicenseDetail?.tradeUnits?.[0]?.tradeType?.split('.')[0]}`)} />
          {application?.tradeLicenseDetail?.tradeUnits?.[0]?.tradeType.includes('ARCHITECT') &&
            <KeyNote keyValue={t("BPA_COUNCIL_OF_ARCH_NO_LABEL")} note={application?.tradeLicenseDetail?.additionalDetail?.counsilForArchNo} />
          }
          <KeyNote keyValue={t("BPA_COMMON_NAME_LABEL")} note={application?.tradeLicenseDetail?.owners?.[0]?.name} />
          <KeyNote keyValue={t("TL_COMMON_TABLE_COL_STATUS")} note={t(`WF_ARCHITECT_${application?.status}`)} />
          {application.status !== "INITIATED"? <Link to={{ pathname: `/digit-ui/citizen/obps/stakeholder/${application?.applicationNumber}`, state: { tenantId: '' } }}>
            <SubmitBar label={t("TL_VIEW_DETAILS")} />
          </Link>:
          <SubmitBar label={t("BPA_COMP_WORKFLOW")} onSubmit={() => getBPAREGFormData(application)}/>}
        </Card>
      ))}
      {bpaData?.map((application, index) => (
        <Card key={index}>
          <KeyNote keyValue={t("BPA_COMMON_APP_NO")} note={application?.applicationNo} />
          <KeyNote keyValue={t("BPA_BASIC_DETAILS_APPLICATION_TYPE_LABEL")} note={t(`WF_BPA_BUILDING_PLAN_SCRUTINY`)} />
          <KeyNote keyValue={t("BPA_COMMON_SERVICE")} note={t(`BPA_SERVICETYPE_NEW_CONSTRUCTION`)} />
          <KeyNote keyValue={t("TL_COMMON_TABLE_COL_STATUS")} note={t(`WF_BPA_${application?.state}`)} />
          <KeyNote keyValue={t("BPA_COMMON_SLA")} note={application?.sla} />
          <Link to={{ pathname: `/digit-ui/citizen/obps/bpa/${application?.applicationNo}`, state: { tenantId: '' } }}>
            <SubmitBar label={t("TL_VIEW_DETAILS")} />
          </Link>
        </Card>
      ))}
    </Fragment>
  )
};

export default MyApplication;
import React, { useState, Fragment, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FormComposer, Header, Card, CardSectionHeader, PDFSvg, Loader, StatusTable, Row, ActionBar, SubmitBar, MultiLink } from "@egovernments/digit-ui-react-components";
import ApplicationDetailsTemplate from "../../../../../templates/ApplicationDetails";
import { newConfig } from "../../../config/InspectionReportConfig";
import get from "lodash/get";
import orderBy from "lodash/orderBy";
import { getBusinessServices } from "../../../utils";

const BpaApplicationDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const [showToast, setShowToast] = useState(null);
  const [canSubmit, setSubmitValve] = useState(false);
  const defaultValues = {};
  const history = useHistory();
  // delete
  const [_formData, setFormData, _clear] = Digit.Hooks.useSessionStorage("store-data", null);
  const [mutationHappened, setMutationHappened, clear] = Digit.Hooks.useSessionStorage("EMPLOYEE_MUTATION_HAPPENED", false);
  const [successData, setsuccessData, clearSuccessData] = Digit.Hooks.useSessionStorage("EMPLOYEE_MUTATION_SUCCESS_DATA", {});
  const [error, setError] = useState(null);
  const [payments, setpayments] = useState([]);
  const stateId = Digit.ULBService.getStateId();

  const { isMdmsLoading, data: mdmsData } = Digit.Hooks.obps.useMDMS(stateId, "BPA", ["RiskTypeComputation"]);

  const { data = {}, isLoading } = Digit.Hooks.obps.useBPADetailsPage(tenantId, { applicationNo: id });


  let businessService = [];

  if(data && data?.applicationData?.businessService === "BPA_LOW")
  {
    businessService = ["BPA.LOW_RISK_PERMIT_FEE"]
  }
  else if(data && data?.applicationData?.businessService === "BPA" && data?.applicationData?.riskType === "HIGH")
  {
    businessService = ["BPA.NC_APP_FEE","BPA.NC_SAN_FEE"];
  }
  else
  {
    businessService = ["BPA.NC_OC_APP_FEE","BPA.NC_OC_SAN_FEE"];
  }


  useEffect(async() => {
    businessService.length > 0 && businessService.map((buss,index) => {
      let res = Digit.PaymentService.recieptSearch(data?.applicationData?.tenantId, buss, {consumerCodes: data?.applicationData?.applicationNo}).then((value) => {

       value?.Payments[0] && !(payments.filter((val) => val?.id ===value?.Payments[0].id).length>0) && setpayments([...payments,...value?.Payments]);  
      });
    })
    
  },[data, businessService]);

  useEffect(() => {
    let payval=[]
    payments.length>0 && payments.map((ob) => {
      ob?.paymentDetails?.[0]?.bill?.billDetails?.[0]?.billAccountDetails.map((bill,index) => {
        payval.push({title:`${bill?.taxHeadCode}_DETAILS`, value:""});
        payval.push({title:bill?.taxHeadCode, value:`₹${bill?.amount}`});
        payval.push({title:"BPA_STATUS_LABEL", value:"Paid"});
      })
      payval.push({title:"BPA_TOT_AMT_PAID", value:`₹${ob?.paymentDetails?.[0]?.bill?.billDetails?.[0]?.amount}`});
    })
    payments.length > 0 && !(data.applicationDetails.filter((ob) => ob.title === "BPA_FEE_DETAILS_LABEL").length>0)&& data.applicationDetails.push({
      title:"BPA_FEE_DETAILS_LABEL",
      additionalDetails:{
        inspectionReport:[],
        values:[...payval]
      }
    })
  },[payments]);


  async function getRecieptSearch({tenantId,payments,...params}) {
    let response = { filestoreIds: [payments?.fileStoreId] };
    if (!payments?.fileStoreId) {
      response = await Digit.PaymentService.generatePdf(tenantId, { Payments: payments }, "consolidatedreceipt");
    }
    const fileStore = await Digit.PaymentService.printReciept(tenantId, { fileStoreIds: response.filestoreIds[0] });
    window.open(fileStore[response?.filestoreIds[0]], "_blank");
  }

  async function getPermitOccupancyOrderSearch({tenantId},order) {
    let requestData = {...data?.applicationData, edcrDetail:[{...data?.edcrDetails}]}
    let response = await Digit.PaymentService.generatePdf(tenantId, { Bpa: [requestData] }, order);
    const fileStore = await Digit.PaymentService.printReciept(tenantId, { fileStoreIds: response.filestoreIds[0] });
    window.open(fileStore[response?.filestoreIds[0]], "_blank");
  }

  async function getRevocationPDFSearch({tenantId,...params}) {
    let requestData = {...data?.applicationData}
    let response = await Digit.PaymentService.generatePdf(tenantId, { Bpa: [requestData] }, "bpa-revocation");
    const fileStore = await Digit.PaymentService.printReciept(tenantId, { fileStoreIds: response.filestoreIds[0] });
    window.open(fileStore[response?.filestoreIds[0]], "_blank");
  }

  

  // const { data: reciept_data, isLoading: recieptDataLoading } = Digit.Hooks.useRecieptSearch(
  //   {
  //     tenantId: value?.tenantId,
  //     businessService: "BPA.NC_APP_FEE",
  //     consumerCodes: value?.applicationNo,
  //   },
  //   {}
  // );

  const [showOptions, setShowOptions] = useState(false);


  const {
    isLoading: updatingApplication,
    isError: updateApplicationError,
    data: updateResponse,
    error: updateError,
    mutate,
  } = Digit.Hooks.obps.useApplicationActions(tenantId);

  const nocMutation = Digit.Hooks.obps.useObpsAPI(
    tenantId,
    true
  );
  let risType = "";
  sessionStorage.setItem("bpaApplicationDetails", true);


  function checkHead(head) {
    if (head === "ES_NEW_APPLICATION_LOCATION_DETAILS") {
      return "TL_CHECK_ADDRESS";
    } else if (head === "ES_NEW_APPLICATION_OWNERSHIP_DETAILS") {
      return "TL_OWNERSHIP_DETAILS_HEADER";
    } else {
      return head;
    }
  }


  const closeToast = () => {
    setShowToast(null);
    setError(null);
  };

  useEffect(() => {
    setMutationHappened(false);
    clearSuccessData();
  }, []);

  const onFormValueChange = (setValue, formData, formState) => {
    setSubmitValve(!Object.keys(formState.errors).length);
  };
  let configs = newConfig;

  let workflowDetails = Digit.Hooks.useWorkflowDetails({
    tenantId: tenantId,
    id: id,
    moduleCode: "BPA",
  });

  if (workflowDetails && workflowDetails.data && !workflowDetails.isLoading)
    workflowDetails.data.actionState = { ...workflowDetails.data };

  if (mdmsData?.BPA?.RiskTypeComputation && data?.edcrDetails) {
    risType = Digit.Utils.obps.calculateRiskType(mdmsData?.BPA?.RiskTypeComputation, data?.edcrDetails?.planDetail?.plot?.area, data?.edcrDetails?.planDetail?.blocks);
    data?.applicationDetails?.map(detail => {
      if (detail?.isInsert) {
        detail.values?.forEach(value => {
          if (value?.isInsert) value.value = `WF_BPA_${risType}`
        })
      }
    })
  }

  const userInfo = Digit.UserService.getUser();
  const rolearray = userInfo?.info?.roles.filter(item => {
    if ((item.code == "CEMP" && item.tenantId === tenantId) || item.code == "CITIZEN") return true;
  });

  if (workflowDetails?.data?.processInstances?.length > 0) {
    let filteredActions = [];
    filteredActions = get(workflowDetails?.data?.processInstances[0], "nextActions", [])?.filter(
      item => item.action != "ADHOC"
    );
    let actions = orderBy(filteredActions, ["action"], ["desc"]);
    if ((!actions || actions?.length == 0) && workflowDetails?.data?.actionState) workflowDetails.data.actionState.nextActions = [];
  }

  if (rolearray) {
    workflowDetails?.data?.nextActions?.forEach(action => {
      if (action?.action === "PAY") {
        action.redirectionUrll =  {
          pathname: `${getBusinessServices(data?.applicationData?.businessService, data?.applicationData?.status)}/${data?.applicationData?.applicationNo}/${tenantId}`,
          state: tenantId
        }
      }
    })
  };

  let dowloadOptions = [];
  if(data?.applicationData?.businessService==="BPA_OC" && data?.applicationData?.status==="APPROVED"){
    dowloadOptions.push({
      label: t("BPA_OC_CERTIFICATE"),
      onClick: () => getPermitOccupancyOrderSearch({tenantId: data?.applicationData?.tenantId},"occupancy-certificate"),
    });
  }
  if(data?.comparisionReport){
    dowloadOptions.push({
      label: t("BPA_COMPARISON_REPORT_LABEL"),
      onClick: () => window.open(data?.comparisionReport?.comparisonReport, "_blank"),
    });
  }
  if(data && data?.applicationData?.businessService === "BPA_LOW")
  {
    dowloadOptions.push({
      label: t("BPA_FEE_RECEIPT"),
      onClick: () => getRecieptSearch({tenantId: data?.applicationData?.tenantId,payments: payments[0],consumerCodes: data?.applicationData?.applicationNo}),
    });
    !(data?.applicationData?.status.includes("REVOCATION")) && dowloadOptions.push({
      label: t("BPA_PERMIT_ORDER"),
      onClick: () => getPermitOccupancyOrderSearch({tenantId: data?.applicationData?.tenantId},"buildingpermit-low"),
    });
    (data?.applicationData?.status.includes("REVOCATION")) && dowloadOptions.push({
      label: t("BPA_REVOCATION_PDF_LABEL"),
      onClick: () => getRevocationPDFSearch({tenantId: data?.applicationData?.tenantId}),
    });
    
  }
  else if(data && data?.applicationData?.businessService === "BPA" && data?.applicationData?.riskType === "HIGH")
  {
    dowloadOptions.push({
      label: t("BPA_APP_FEE_RECEIPT"),
      onClick: () => getRecieptSearch({tenantId: data?.applicationData?.tenantId,payments: payments[0],consumerCodes: data?.applicationData?.applicationNo}),
    });
    if(payments.length == 2)dowloadOptions.push({
      label: t("BPA_SAN_FEE_RECEIPT"),
      onClick: () => getRecieptSearch({tenantId: data?.applicationData?.tenantId,payments: payments[1],consumerCodes: data?.applicationData?.applicationNo}),
    });
  }
  else
  {
    dowloadOptions.push({
      label: t("BPA_APP_FEE_RECEIPT"),
      onClick: () => getRecieptSearch({tenantId: data?.applicationData?.tenantId,payments: payments[0],consumerCodes: data?.applicationData?.applicationNo}),
    });
    if(payments.length == 2)dowloadOptions.push({
      label: t("BPA_SAN_FEE_RECEIPT"),
      onClick: () => getRecieptSearch({tenantId: data?.applicationData?.tenantId,payments: payments[1],consumerCodes: data?.applicationData?.applicationNo}),
    });
  }

    


  return (
    <Fragment>
      <div style={{ marginLeft: "15px" }}>
        <Header>{t("BPA_TASK_DETAILS_HEADER")}</Header>
        <MultiLink
          className="multilinkWrapper"
          onHeadClick={() => setShowOptions(!showOptions)}
          displayOptions={showOptions}
          options={dowloadOptions}
        />
      </div>
      {data?.applicationData?.status === "FIELDINSPECTION_INPROGRESS" && <div style={{ marginLeft: "15px" }}>
        <Header>{t("BPA_FI_REPORT")}</Header>
      </div>}
      {data?.applicationData?.status === "FIELDINSPECTION_INPROGRESS" && <FormComposer
        heading={t("")}
        isDisabled={!canSubmit}
        config={configs.map((config) => {
          return {
            ...config,
            body: config.body.filter((a) => {
              return !a.hideInEmployee;
            }),
            head: checkHead(config.head),
          };
        })}
        fieldStyle={{ marginRight: 0 }}
        submitInForm={false}
        defaultValues={defaultValues}
        onFormValueChange={onFormValueChange}
        breaklineStyle={{ border: "0px" }}
      />}
      <ApplicationDetailsTemplate
        applicationDetails={data}
        isLoading={isLoading}
        isDataLoading={isLoading}
        applicationData={data?.applicationData}
        nocMutation={nocMutation}
        mutate={mutate}
        workflowDetails={workflowDetails}
        businessService={workflowDetails?.data?.applicationBusinessService ? workflowDetails?.data?.applicationBusinessService : data?.applicationData?.businessService}
        moduleCode="BPA"
        showToast={showToast}
        setShowToast={setShowToast}
        closeToast={closeToast}
        timelineStatusPrefix={`WF_${workflowDetails?.data?.applicationBusinessService ? workflowDetails?.data?.applicationBusinessService : data?.applicationData?.businessService}_`}
      />
    </Fragment>
  )
};

export default BpaApplicationDetail;
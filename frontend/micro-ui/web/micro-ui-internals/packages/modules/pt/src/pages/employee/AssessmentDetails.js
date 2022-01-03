import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ApplicationDetailsTemplate from "../../../../templates/ApplicationDetails";

import { useParams, useLocation, useHistory } from "react-router-dom";
import { ActionBar, Header, Loader, SubmitBar } from "@egovernments/digit-ui-react-components";
import { useQueryClient } from "react-query";
import _ from "lodash";

const AssessmentDetails = () => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const { id: propertyId } = useParams();
  const location = useLocation();
  const AssessmentData = location?.state?.Assessment;
  const [showToast, setShowToast] = useState(null);
  const queryClient = useQueryClient();
  const history = useHistory();
  const [appDetailsToShow, setAppDetailsToShow] = useState({});

  let { isLoading, isError, data: applicationDetails, error } = Digit.Hooks.pt.useApplicationDetail(t, tenantId, propertyId);
  const { isLoading: assessmentLoading, mutate: assessmentMutate } = Digit.Hooks.pt.usePropertyAssessment(tenantId);
  const {
    isLoading: ptCalculationEstimateLoading,
    data: ptCalculationEstimateData,
    mutate: ptCalculationEstimateMutate,
  } = Digit.Hooks.pt.usePtCalculationEstimate(tenantId);

  useEffect(() => {
    // estimate calculation
    ptCalculationEstimateMutate({ Assessment: AssessmentData });
    }, []);

  useEffect(() => {
    if (applicationDetails) setAppDetailsToShow(_.cloneDeep(applicationDetails));
    // applicationDetails.applicationDetails=applicationDetails.applicationDetails.filter(e=>e.title!=="PT_OWNERSHIP_INFO_SUB_HEADER");
  }, [applicationDetails]);

  let workflowDetails = Digit.Hooks.useWorkflowDetails({
    tenantId: applicationDetails?.tenantId || tenantId,
    id: applicationDetails?.applicationData?.acknowldgementNumber,
    moduleCode: "PT",
    role: "PT_CEMP",
    // serviceData: applicationDetails,
  });
  const date=new Date();

  appDetailsToShow?.applicationDetails?.shift();
  appDetailsToShow?.applicationDetails?.unshift({
    title: "PT_ESTIMATE_DETAILS_HEADER",
    values: [ 
      {
        title: "PT_PROPERTY_PTUID",
        value: propertyId,  
      },
      // changed from here
      {
        title: "Property Address",
        value: applicationDetails.applicationData.address.doorNo+','+applicationDetails.applicationData.address.locality.area+','+applicationDetails.applicationData.address.locality.name+','+applicationDetails.applicationData.address.city,
      },
      {
        title: "ES_PT_TITLE_BILLING_PERIOD",
        value: location?.state?.Assessment?.financialYear,
      },
      {
        title:"Billing Due Date",
        value:date.getDate()+'-'+date.getMonth()+'-'+date.getFullYear(),
      },
    ],
    }
  );
  appDetailsToShow?.applicationDetails?.push({
    belowComponent:()=>{return <a href="" style={{color:"red"}}>Add Rebate/Penality</a>}
  })
  appDetailsToShow?.applicationDetails?.push(
    {
    title:"Calculation Details",
    values:[
        {
      title:"Calculation Logic",
      value:"Property Tax = Built up area on GF * Rates per unit of GF - built up empty land on GF * Rate per unit of GF - empty land 𝝨(built-up on nth floor*Rate per unit of nth floor-built up)",  
        },
        {
            title:"Applicable Charge Slabs",
            values:[
                    {
                    title:"Ground floor unit-1",
                    value:"2/Sq yards",
                    }],
          }
      ],
    }
  );
  console.log(applicationDetails);
  const closeToast = () => {
    setShowToast(null);
  };



  const handleAssessment = () => {
    if (!queryClient.getQueryData(["PT_ASSESSMENT", propertyId, location?.state?.Assessment?.financialYear])) {
      assessmentMutate(
        { Assessment: AssessmentData },
        {
          onError: (error, variables) => {
            setShowToast({ key: "error", action: error?.response?.data?.Errors[0]?.message || error.message });
            setTimeout(closeToast, 5000);
          },
          onSuccess: (data, variables) => {
            sessionStorage.setItem("IsPTAccessDone", data?.Assessments?.[0]?.auditDetails?.lastModifiedTime);
            setShowToast({ key: "success", action: { action: "ASSESSMENT" } });
            setTimeout(closeToast, 5000);
            queryClient.clear();
            queryClient.setQueryData(["PT_ASSESSMENT", propertyId, location?.state?.Assessment?.financialYear], true);
          },
        }
      );
    }
  };

  const proceeedToPay = () => {
    history.push(`/digit-ui/employee/payment/collect/PT/${propertyId}`);
  };

  if (ptCalculationEstimateLoading || assessmentLoading) {
    return <Loader />;
  }

  return (
    <div>
      {/* <Header>{t("PT_ASSESS_PROPERTY")}</Header> */}
      <Header>Property Tax Assessment</Header>
      <ApplicationDetailsTemplate
        applicationDetails={appDetailsToShow}
        isLoading={isLoading}
        isDataLoading={isLoading}
        applicationData={appDetailsToShow?.applicationData}
        mutate={null}
        workflowDetails={
          queryClient.getQueryData(["PT_ASSESSMENT", propertyId, location?.state?.Assessment?.financialYear])
            ? { ...workflowDetails, data: { ...workflowDetails.data, nextActions: [] } }
            : workflowDetails
        }
        businessService="PT"
        assessmentMutate={assessmentMutate}
        ptCalculationEstimateMutate={ptCalculationEstimateMutate}
        showToast={showToast}
        setShowToast={setShowToast}
        closeToast={closeToast}
        timelineStatusPrefix={"ES_PT_COMMON_STATUS_"}
        forcedActionPrefix={"WF_EMPLOYEE_PT.CREATE"}
      />
      {!queryClient.getQueryData(["PT_ASSESSMENT", propertyId, location?.state?.Assessment?.financialYear]) ? (
        <ActionBar>
          <SubmitBar label={t("PT_ASSESS_PROPERTY_BUTTON")} onSubmit={handleAssessment} />
        </ActionBar>
      ) : (
        <ActionBar>
          <SubmitBar label={t("PT_PROCEED_PAYMENT")} onSubmit={proceeedToPay} />
        </ActionBar>
      )}
    </div>
  );
};

export default AssessmentDetails;

import useInbox from "../useInbox"

const useWSInbox = ({ tenantId, filters, config={} }) => {
    const { filterForm, searchForm , tableForm } = filters;
    const user = Digit.UserService.getUser();
    let { moduleName, businessService, applicationStatus, locality, assignee, applicationType } = filterForm;
    const { mobileNumber, applicationNo } = searchForm;
    const { sortBy, limit, offset, sortOrder } = tableForm;
    let applicationNumber = "";
    // if (window.location.href.includes("stakeholder-inbox")) moduleName = "BPAREG";
    // if (moduleName == "BPAREG") {
    //   applicationNumber = applicationNo;
    //   tenantId = Digit.ULBService.getStateId();
    // }
    // if(applicationType === "BUILDING_OC_PLAN_SCRUTINY" && window.location.href.includes("obps/inbox") && businessService) {
    //   businessService = "BPA_OC"
    // }

    const _filters = {
        tenantId,
        processSearchCriteria: {
          assignee : assignee === "ASSIGNED_TO_ME"?user?.info?.uuid:"",
          moduleName: moduleName?.[0], 
          businessService: moduleName !== "ws-services"  ? ["NewWS1","ModifyWSConnection"] : ["NewSW1","ModifySWConnection"],
          ...(applicationStatus?.length > 0 ? {status: applicationStatus} : {}),
        },
        moduleSearchCriteria: {
          ...(mobileNumber ? {mobileNumber}: {}),
          ...(!applicationNumber ? applicationNo ? {applicationNo} : {} : (applicationNumber ? {applicationNumber} : {})),
          ...(applicationNumber ? {applicationNumber} : {}),
          ...(sortOrder ? {sortOrder} : {}),
          ...(sortBy ? {sortBy} : {}),
          // ...(applicationType?.length > 0 ? {applicationType: applicationType.map((item) => item.code).join(",")} : {}),
          ...(applicationType && applicationType?.length > 0 ? {applicationType} : {}),
          ...(locality?.length > 0 ? {locality: locality.map((item) => item.code.split("_").pop()).join(",")} : {}),
        },
        limit,
        offset,
    }

    return useInbox({tenantId, filters: _filters, config:{
        select: (data) =>({
          statuses: data.statusMap, 
          table: data?.items.map( application => ({
              applicationId: application.businessObject.applicationNo || application.businessObject.applicationNumber,
              date: application.businessObject.auditDetails.createdTime,
              businessService: application?.ProcessInstance?.businessService,
              applicationType: application?.businessObject?.additionalDetails?.applicationType ? `WF_BPA_${application?.businessObject?.additionalDetails?.applicationType}` : "-",
              locality: `${application.businessObject?.tenantId?.toUpperCase()?.split(".")?.join("_")}_REVENUE_${application.businessObject?.additionalDetails?.locality?.toUpperCase()}`,
              status: application?.ProcessInstance?.state?.state,
              state:  application?.ProcessInstance?.state?.state,
              owner: application?.ProcessInstance?.assignes?.[0]?.name || "NA",
              creator: application?.ProcessInstance?.assigner?.[0]?.name || "NA",
              sla: Math.round(application.ProcessInstance?.businesssServiceSla / (24 * 60 * 60 * 1000)),
          })),
          totalCount: data.totalCount
        }), 
        ...config 
      }
    })
}

export default useWSInbox

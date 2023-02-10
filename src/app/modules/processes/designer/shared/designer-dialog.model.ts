export interface FilterCriteriaDialogResultModel {
    aspect: string;
    iotfunction: string;
    characteristic: string;
    label: string;
}

export interface ConditionalEventEditModel {
    aspect: string;
    iotfunction: string;
    characteristic: string;
    script: string;
    valueVariableName: string;
    variables: string;
    qos: string;
    label: string;
}
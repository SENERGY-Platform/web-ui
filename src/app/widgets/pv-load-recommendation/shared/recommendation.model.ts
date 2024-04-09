export interface PVLoadRecommendationResult {
    [deviceID: string]: boolean;
}

export interface PVLoadRecommendationWidgetPropertiesModel {
    pvLoadRecommendation?: {
        exportID: string;
    };
}

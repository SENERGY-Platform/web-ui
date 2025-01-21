/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface NotificationModel {
    title: string;
    message: string;
    userId: string;
    _id: string;
    isRead: boolean;
    created_at: Date | null;
}

export interface NotificationUpdateModel {
    title: string;
    message: string;
    userId: string;
    isRead: boolean;
    created_at: Date | null;
}

export interface NotificationServiceResponse {
    notifications: NotificationModel[];
}

export interface NotificationBrokerModel {
    id: string;
    address: string;
    user: string;
    password: string;
    topic: string;
    qos: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface NotificationBrokerListModel {
    total: number;
    limit: number;
    offset: number;
    brokers: NotificationBrokerModel[];
}

export interface NotificationPlatformBrokerModel {
    enabled: boolean;
}

export type NotificationTopic = string;

export const notificationTopicProcesses: NotificationTopic = 'processes';
export const notificationTopicSmartService: NotificationTopic = 'smart_service';
export const notificationTopicDeviceOffline: NotificationTopic = 'device_offline';
export const notificationTopicDeveloper: NotificationTopic = 'developer';
export const notificationTopicConnector: NotificationTopic = 'connector';
export const notificationTopicMGW: NotificationTopic = 'mgw';
export const notificationTopicIncident: NotificationTopic = 'incident';
export const notificationTopicUnknown: NotificationTopic = 'unknown';

export function getAllTopics(): NotificationTopic[] {
    return [
        notificationTopicProcesses,
        notificationTopicSmartService,
        notificationTopicDeviceOffline,
        notificationTopicDeveloper,
        notificationTopicConnector,
        notificationTopicMGW,
        notificationTopicIncident,
        notificationTopicUnknown,
    ];
}

export interface NotificationSettingsModel {
    channel_topic_config: {
        websoket: NotificationTopic[];
        mqtt: NotificationTopic[];
        push: NotificationTopic[];
        email: NotificationTopic[];
    };
}

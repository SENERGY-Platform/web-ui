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
    topic?: NotificationTopic;
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
export const notificationTopicAnalytics: NotificationTopic = 'analytics';
export const notificationTopicUnknown: NotificationTopic = 'unknown';

export interface NotificationTopicInfo {
    topic: NotificationTopic;
    label: string;
    icon: string;
    description: string;
    /** Marks topics that only exist for backwards compatibility and should not receive new notifications. */
    legacy?: boolean;
}

/**
 * Descriptions and usage taken from the platform documentation:
 * https://bitnify.atlassian.net/wiki/spaces/SES/pages/194084879/Notifications
 */
export const notificationTopicInfos: NotificationTopicInfo[] = [
    {
        topic: notificationTopicProcesses,
        label: 'Processes',
        icon: 'timeline',
        description: 'Raised while a process runs, e.g. a washing machine reporting that it is done. Sent by process executions in cloud and fog.',
    },
    {
        topic: notificationTopicSmartService,
        label: 'Smart Services',
        icon: 'design_services',
        description: 'Raised by smart services themselves, and errors that occur while a smart service runs. Sent by the smart service engine.',
    },
    {
        topic: notificationTopicDeviceOffline,
        label: 'Device offline',
        icon: 'cloud_off',
        description: 'Sent by the connection check when a device goes offline. Only devices carrying the monitor_connection_state attribute are watched.',
    },
    {
        topic: notificationTopicDeveloper,
        label: 'Developer',
        icon: 'engineering',
        description: 'Reserved for developers who want to test notifications. You will not receive these during normal platform use.',
    },
    {
        topic: notificationTopicConnector,
        label: 'Connector',
        icon: 'device_hub',
        description: 'Sent by the cloud connector, for example when a device message cannot be parsed.',
    },
    {
        topic: notificationTopicMGW,
        label: 'Gateway',
        icon: 'home',
        description: 'Raised by components of your multi-gateway and forwarded to the platform by the cloud connector.',
    },
    {
        topic: notificationTopicIncident,
        label: 'Incidents',
        icon: 'warning',
        description: 'Sent by the process incident worker when a process execution runs into an incident.',
    },
    {
        topic: notificationTopicAnalytics,
        label: 'Analytics',
        icon: 'bar_chart',
        description: 'Sent by the notification operator and by central anomaly detection.',
    },
    {
        topic: notificationTopicUnknown,
        label: 'Uncategorised',
        icon: 'chat',
        description: 'Collects notifications that were created without a topic. Only legacy components still do this.',
        legacy: true,
    },
];

const topicInfoByTopic: Record<string, NotificationTopicInfo> =
    notificationTopicInfos.reduce((acc, info) => ({ ...acc, [info.topic]: info }), {});

export function getTopicInfo(topic?: NotificationTopic): NotificationTopicInfo | undefined {
    return topic === undefined ? undefined : topicInfoByTopic[topic];
}

export function getTopicIcon(topic?: NotificationTopic): string {
    return getTopicInfo(topic)?.icon || 'chat';
}

/**
 * Keys of NotificationSettingsModel.channel_topic_config. `websoket` is misspelled in the
 * notifier API itself, so the typo has to stay in the wire format.
 */
export type NotificationChannel = 'websoket' | 'mqtt' | 'push' | 'email';

export interface NotificationChannelInfo {
    channel: NotificationChannel;
    label: string;
    icon: string;
    description: string;
    /** Limitations a user cannot see from the settings alone, shown next to the channel. */
    caveat?: string;
}

/**
 * Channel behaviour taken from the platform documentation:
 * https://bitnify.atlassian.net/wiki/spaces/SES/pages/194084879/Notifications
 */
export const notificationChannelInfos: NotificationChannelInfo[] = [
    {
        channel: 'websoket',
        label: 'In-App',
        icon: 'desktop_windows',
        description: 'Shows notifications live in this web UI, including updates and deletions.',
    },
    {
        channel: 'email',
        label: 'E-Mail',
        icon: 'mail',
        description: 'Sends an e-mail to the verified address of your account.',
        caveat: 'Only sent when a notification is created — never when one is updated or deleted. Requires a verified e-mail address on your account.',
    },
    {
        channel: 'push',
        label: 'Push',
        icon: 'smartphone',
        description: 'Pushes notifications to mobile apps and browsers via Firebase Cloud Messaging.',
        caveat: 'Only reaches clients that registered a push token, such as the OPTIMISE app. With no registered client, nothing is delivered.',
    },
    {
        channel: 'mqtt',
        label: 'MQTT',
        icon: 'call_split',
        description: 'Publishes notifications to the platform broker and to your custom brokers.',
        caveat: 'Deletions are not published. Configure the destinations under "MQTT brokers".',
    },
];

export type NotificationChannelTopicConfig = Record<NotificationChannel, NotificationTopic[]>;

export interface NotificationSettingsModel {
    channel_topic_config: NotificationChannelTopicConfig;
}

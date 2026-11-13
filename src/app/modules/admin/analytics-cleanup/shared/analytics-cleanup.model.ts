/*
 * Copyright 2026 InfAI (CC SES)
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

/** A pipeline id with resources in the analytics namespace and no registry entry; `created` is the newest resource. */
export interface OrphanPipeline {
    pipeline_id: string;
    created: string;
    deployment: string;
    vpa: string;
    checkpoints: string[];
    pvcs: string[];
}

export interface OrphanPipelinesDeleteResult {
    deleted: string[];
    failed: { pipeline_id: string; error: string }[];
}

export interface TopicCleanupJob {
    total: number;
    remaining: number;
    running: boolean;
    errors: string[];
}

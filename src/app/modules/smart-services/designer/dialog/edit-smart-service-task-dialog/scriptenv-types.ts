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

/*
 * VENDORED -- do not edit by hand. This is doc/script-env.d.ts of
 * github.com/SENERGY-Platform/smart-service-module-worker-lib, where it is generated
 * from the go source by `go generate ./...`, wrapped as a string.
 *
 * Refresh with:
 *
 *   npm run vendor:scriptenv-types -- <path-to>/doc/script-env.d.ts \
 *     src/app/modules/smart-services/designer/dialog/edit-smart-service-task-dialog/scriptenv-types.ts
 */

/** Declarations handed to the code editor as a TypeScript extra lib. */
export const smartServiceScriptEnvTypes = `
/*
 * Copyright (c) 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * generated in github.com/SENERGY-Platform/smart-service-module-worker-lib with a command like:
 * go generate ./...
 *
 * declares what a smart-service pre/postscript may use. property names are the names
 * the script runtime exposes, which are the json tag names of the underlying go structs.
*/

interface Aspect {
    id: string;
    name: string;
    sub_aspects: Aspect[];
}

interface AspectNode {
    id: string;
    name: string;
    root_id: string;
    parent_id: string;
    child_ids: string[];
    ancestor_ids: string[];
    descendent_ids: string[];
}

interface Attribute {
    key: string;
    value: string;
    origin: string;
}

interface Characteristic {
    id: string;
    name: string;
    display_unit: string;
    type: string;
    min_value: any;
    max_value: any;
    allowed_values: any[];
    value: any;
    sub_characteristics: Characteristic[];
}

interface Concept {
    id: string;
    name: string;
    characteristic_ids: string[];
    base_characteristic_id: string;
    conversions: ConverterExtension[];
}

interface ConceptWithCharacteristics {
    id: string;
    name: string;
    base_characteristic_id: string;
    characteristics: Characteristic[];
    conversions: ConverterExtension[];
}

interface Configurable {
    path: string;
    characteristic_id: string;
    aspect_node: AspectNode;
    function_id: string;
    value: any;
    type: string;
}

interface Content {
    id: string;
    content_variable: ContentVariable;
    serialization: string;
    protocol_segment_id: string;
}

interface ContentVariable {
    id: string;
    name: string;
    is_void: boolean;
    omit_empty: boolean;
    type: string;
    sub_content_variables: ContentVariable[];
    characteristic_id: string;
    value: any;
    serialization_options: string[];
    unit_reference: string;
    function_id: string;
    aspect_id: string;
}

interface ConverterExtension {
    from: string;
    to: string;
    distance: number;
    formula: string;
    placeholder_name: string;
}

interface Device {
    id: string;
    local_id: string;
    name: string;
    attributes: Attribute[];
    device_type_id: string;
    owner_id: string;
}

interface DeviceClass {
    id: string;
    image: string;
    name: string;
}

interface DeviceGroup {
    id: string;
    name: string;
    image: string;
    criteria: DeviceGroupFilterCriteria[];
    device_ids: string[];
    criteria_short: string[];
    attributes: Attribute[];
    auto_generated_by_device: string;
}

interface DeviceGroupFilterCriteria {
    interaction: string;
    function_id: string;
    aspect_id: string;
    device_class_id: string;
}

interface DeviceGroupSelection {
    id: string;
}

interface DeviceSelection {
    device_id: string;
    service_id: string | null;
    path: string | null;
    characteristic_id: string | null;
}

interface DeviceType {
    id: string;
    name: string;
    description: string;
    service_groups: ServiceGroup[];
    services: Service[];
    device_class_id: string;
    attributes: Attribute[];
}

interface DeviceTypeSelectable {
    device_type_id: string;
    services: Service[];
    service_path_options: Record<string, ServicePathOption[]>;
}

interface FilterCriteria {
    interaction: string;
    function_id: string;
    device_class_id: string;
    aspect_id: string;
}

interface FunctionType {
    id: string;
    name: string;
    display_name: string;
    description: string;
    concept_id: string;
    rdf_type: string;
}

interface GenericEventSource {
    filter_type: string;
    filter_ids: string;
    topic: string;
    path: string;
    characteristic_id: string | null;
}

interface Hub {
    id: string;
    name: string;
    hash: string;
    device_local_ids: string[];
    device_ids: string[];
    owner_id: string;
}

interface ImportSelection {
    id: string;
    path: string | null;
    characteristic_id: string | null;
}

interface IotOption {
    device_selection: DeviceSelection | null;
    device_group_selection: DeviceGroupSelection | null;
    import_selection: ImportSelection | null;
    generic_event_source: GenericEventSource | null;
}

interface Location {
    id: string;
    name: string;
    description: string;
    image: string;
    device_ids: string[];
    device_group_ids: string[];
}

interface Service {
    id: string;
    local_id: string;
    name: string;
    description: string;
    interaction: string;
    protocol_id: string;
    inputs: Content[];
    outputs: Content[];
    attributes: Attribute[];
    service_group_key: string;
}

interface ServiceGroup {
    key: string;
    name: string;
    description: string;
}

interface ServicePathOption {
    service_id: string;
    path: string;
    characteristic_id: string;
    aspect_node: AspectNode;
    function_id: string;
    is_void: boolean;
    value: any;
    is_controlling_function: boolean;
    configurables: Configurable[];
    type: string;
    interaction: string;
}

declare const deviceRepo: {
    getAspect(id: string): Aspect;
    getAspectNode(id: string): AspectNode;
    getAspectNodes(): AspectNode[];
    getAspectNodesByIdList(ids: string[]): AspectNode[];
    getAspectNodesMeasuringFunctions(id: string, ancestors: boolean, descendants: boolean): FunctionType[];
    getAspectNodesWithMeasuringFunction(ancestors: boolean, descendants: boolean): AspectNode[];
    getAspects(): Aspect[];
    getAspectsWithMeasuringFunction(ancestors: boolean, descendants: boolean): Aspect[];
    getCharacteristic(id: string): Characteristic;
    getConceptWithCharacteristics(id: string): ConceptWithCharacteristics;
    getConceptWithoutCharacteristics(id: string): Concept;
    getDeviceClass(id: string): DeviceClass;
    getDeviceClasses(): DeviceClass[];
    getDeviceClassesControllingFunctions(id: string): FunctionType[];
    getDeviceClassesFunctions(id: string): FunctionType[];
    getDeviceClassesWithControllingFunctions(): DeviceClass[];
    getDeviceTypeSelectables(query: FilterCriteria[], pathPrefix: string, includeModified: boolean, servicesMustMatchAllCriteria: boolean): DeviceTypeSelectable[];
    getFunction(id: string): FunctionType;
    getFunctionsByType(rdfType: string): FunctionType[];
    getLeafCharacteristics(): Characteristic[];
    getLocation(id: string): Location;
    getService(id: string): Service;
    listDeviceTypes(limit: number, offset: number, sort: string, filter: FilterCriteria[], includeModified: boolean, includeUnmodified: boolean): DeviceType[];
    listHubDeviceIds(id: string, asLocalId: boolean): string[];
    readDevice(id: string): Device;
    readDeviceByLocalId(localId: string): Device;
    readDeviceGroup(id: string): DeviceGroup;
    readDeviceType(id: string): DeviceType;
    readHub(id: string): Hub;
};

declare const inputs: {
    /**
     * Exists checks if a process worker input exists
     */
    exists(name: string): boolean;
    /**
     * Get value of a process worker input
     */
    get(name: string): any;
    /**
     * List input values sorted by their names
     */
    list(): any[];
    /**
     * ListNames lists sorted input names
     */
    listNames(): string[];
};

declare const outputs: {
    /**
     * Get a process worker output
     */
    get(name: string): any;
    /**
     * Set a process worker output
     */
    set(name: string, value: any): void;
    /**
     * SetJson marshals the given value to json and sets it as a process worker output
     */
    setJson(name: string, value: any): void;
};

declare const util: {
    /**
     * GetDevicesWithServiceFromEntityString finds a list of iot-options where the entity is the same the input, but the Service field is set with those that match the input criteria
     */
    getDevicesWithServiceFromEntityString(entityStr: string, criteria: FilterCriteria[]): IotOption[];
    /**
     * GetDevicesWithServiceFromIotOption finds a list of iot-options where the entity is the same the input, but the Service field is set with those that match the input criteria
     */
    getDevicesWithServiceFromIotOption(entity: IotOption, criteria: FilterCriteria[]): IotOption[];
    /**
     * GetUserId returns the user-id of the executing user
     */
    getUserId(): string;
    /**
     * GetUserToken returns a jwt-token for the executing user
     */
    getUserToken(): string;
    /**
     * GroupIotOptionsByDevice groups a list of model.IotOption by their device id; options that are not devices will be grouped under ""
     */
    groupIotOptionsByDevice(entities: IotOption[]): Record<string, IotOption[]>;
    /**
     * GroupIotOptionsByService groups a list of IotOption by their service id; options that are not devices or dont hav a service-id will be grouped under ""
     */
    groupIotOptionsByService(entities: IotOption[]): Record<string, IotOption[]>;
    /**
     * IsDeviceGroupIotOption checks if the input is a device-group
     */
    isDeviceGroupIotOption(entity: IotOption): boolean;
    /**
     * IsDeviceGroupIotOptionStr checks if the input is a device-group
     */
    isDeviceGroupIotOptionStr(entityStr: string): boolean;
    /**
     * IsDeviceIotOption checks if the input is a device
     */
    isDeviceIotOption(entity: IotOption): boolean;
    /**
     * IsDeviceIotOptionStr checks if the input is a device
     */
    isDeviceIotOptionStr(entityStr: string): boolean;
    /**
     * IsImportIotOption checks if the input is a import
     */
    isImportIotOption(entity: IotOption): boolean;
    /**
     * IsImportIotOptionStr checks if the input is a import
     */
    isImportIotOptionStr(entityStr: string): boolean;
};

declare const variables: {
    /**
     * DerefName returns the name of a smart-service instance variable referenced in parameter ref
     */
    derefName(ref: string): string;
    /**
     * DerefTemplate replaces variable references in the input string with the corresponding variable values
     */
    derefTemplate(templ: string): string;
    /**
     * DerefValue returns the value of a smart-service instance variable referenced in parameter ref
     */
    derefValue(ref: string): any;
    /**
     * Exists checks if a smart-service instance variable exists
     */
    exists(name: string): boolean;
    /**
     * Read value of a smart-service instance variable
     */
    read(name: string): any;
    /**
     * Ref creates a reference to a variable (e.g. "my_var_name" --> "{{.my_var_name}}")
     * throws exception if variable is unknown
     */
    ref(name: string): string;
    /**
     * Write value as smart-service instance variable
     */
    write(name: string, value: any): void;
};
`;

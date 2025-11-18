/*
 * Copyright (c) 2023 InfAI (CC SES)
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
 * go generate ./... > ace-code-completer.ts
*/

const completer = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    getCompletions(_: any, session: any, pos: any, ___: any, callback: any) {
        const line = session.doc.$lines[pos.row].slice(0, pos.column-1);
        const isNewStatement = line.trim().length === 0 || line.trim().endsWith(';');
        if(isNewStatement){
            callback(null, [
                {
    caption: 'deviceRepo.getAspect',
    value: 'var result_as_Aspect = deviceRepo.getAspect(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNode',
    value: 'var result_as_AspectNode = deviceRepo.getAspectNode(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodes',
    value: 'var result_as_AspectNode_list = deviceRepo.getAspectNodes();',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesByIdList',
    value: 'var result_as_AspectNode_list = deviceRepo.getAspectNodesByIdList(ids_as_string_list);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesMeasuringFunctions',
    value: 'var result_as_FunctionType_list = deviceRepo.getAspectNodesMeasuringFunctions(id_as_string, ancestors_as_boolean, descendants_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesWithMeasuringFunction',
    value: 'var result_as_AspectNode_list = deviceRepo.getAspectNodesWithMeasuringFunction(ancestors_as_boolean, descendants_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspects',
    value: 'var result_as_Aspect_list = deviceRepo.getAspects();',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectsWithMeasuringFunction',
    value: 'var result_as_Aspect_list = deviceRepo.getAspectsWithMeasuringFunction(ancestors_as_boolean, descendants_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getCharacteristic',
    value: 'var result_as_Characteristic = deviceRepo.getCharacteristic(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getConceptWithCharacteristics',
    value: 'var result_as_ConceptWithCharacteristics = deviceRepo.getConceptWithCharacteristics(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getConceptWithoutCharacteristics',
    value: 'var result_as_Concept = deviceRepo.getConceptWithoutCharacteristics(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClass',
    value: 'var result_as_DeviceClass = deviceRepo.getDeviceClass(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClasses',
    value: 'var result_as_DeviceClass_list = deviceRepo.getDeviceClasses();',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesControllingFunctions',
    value: 'var result_as_FunctionType_list = deviceRepo.getDeviceClassesControllingFunctions(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesFunctions',
    value: 'var result_as_FunctionType_list = deviceRepo.getDeviceClassesFunctions(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesWithControllingFunctions',
    value: 'var result_as_DeviceClass_list = deviceRepo.getDeviceClassesWithControllingFunctions();',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceTypeSelectables',
    value: 'var result_as_DeviceTypeSelectable_list = deviceRepo.getDeviceTypeSelectables(query_as_FilterCriteria_list, pathPrefix_as_string, includeModified_as_boolean, servicesMustMatchAllCriteria_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getFunction',
    value: 'var result_as_FunctionType = deviceRepo.getFunction(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getFunctionsByType',
    value: 'var result_as_FunctionType_list = deviceRepo.getFunctionsByType(rdfType_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getLeafCharacteristics',
    value: 'var result_as_Characteristic_list = deviceRepo.getLeafCharacteristics();',
    meta: 'static'
},
{
    caption: 'deviceRepo.getLocation',
    value: 'var result_as_Location = deviceRepo.getLocation(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.getService',
    value: 'var result_as_Service = deviceRepo.getService(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.listDeviceTypes',
    value: 'var result_as_DeviceType_list = deviceRepo.listDeviceTypes(limit_as_number, offset_as_number, sort_as_string, filter_as_FilterCriteria_list, includeModified_as_boolean, includeUnmodified_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.listHubDeviceIds',
    value: 'var result_as_string_list = deviceRepo.listHubDeviceIds(id_as_string, asLocalId_as_boolean);',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDevice',
    value: 'var result_as_Device = deviceRepo.readDevice(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceByLocalId',
    value: 'var result_as_Device = deviceRepo.readDeviceByLocalId(localId_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceGroup',
    value: 'var result_as_DeviceGroup = deviceRepo.readDeviceGroup(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceType',
    value: 'var result_as_DeviceType = deviceRepo.readDeviceType(id_as_string);',
    meta: 'static'
},
{
    caption: 'deviceRepo.readHub',
    value: 'var result_as_Hub = deviceRepo.readHub(id_as_string);',
    meta: 'static'
},
{
    caption: 'inputs.exists',
    value: 'var result_as_boolean = inputs.exists(name_as_string);',
    meta: 'static'
},
{
    caption: 'inputs.get',
    value: 'var result_as_any = inputs.get(name_as_string);',
    meta: 'static'
},
{
    caption: 'inputs.list',
    value: 'var result_as_any_list = inputs.list();',
    meta: 'static'
},
{
    caption: 'inputs.listNames',
    value: 'var result_as_string_list = inputs.listNames();',
    meta: 'static'
},
{
    caption: 'outputs.get',
    value: 'var result_as_any = outputs.get(name_as_string);',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromEntityString',
    value: 'var result_as_IotOption_list = util.getDevicesWithServiceFromEntityString(entityStr_as_string, criteria_as_FilterCriteria_list);',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromIotOption',
    value: 'var result_as_IotOption_list = util.getDevicesWithServiceFromIotOption(entity_as_IotOption, criteria_as_FilterCriteria_list);',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromIotOption',
    value: 'var result_as_IotOption_list = util.getDevicesWithServiceFromIotOption(entity_as_IotOption, criteria_as_FilterCriteria_list);',
    meta: 'static'
},
{
    caption: 'util.getUserId',
    value: 'var result_as_string = util.getUserId();',
    meta: 'static'
},
{
    caption: 'util.getUserToken',
    value: 'var result_as_string = util.getUserToken();',
    meta: 'static'
},
{
    caption: 'util.groupIotOptionsByDevice',
    value: 'var result_as_IotOption_list_map = util.groupIotOptionsByDevice(entities_as_IotOption_list);',
    meta: 'static'
},
{
    caption: 'util.groupIotOptionsByService',
    value: 'var result_as_IotOption_list_map = util.groupIotOptionsByService(entities_as_IotOption_list);',
    meta: 'static'
},
{
    caption: 'util.isDeviceGroupIotOption',
    value: 'var result_as_boolean = util.isDeviceGroupIotOption(entity_as_IotOption);',
    meta: 'static'
},
{
    caption: 'util.isDeviceGroupIotOptionStr',
    value: 'var result_as_boolean = util.isDeviceGroupIotOptionStr(entityStr_as_string);',
    meta: 'static'
},
{
    caption: 'util.isDeviceIotOption',
    value: 'var result_as_boolean = util.isDeviceIotOption(entity_as_IotOption);',
    meta: 'static'
},
{
    caption: 'util.isDeviceIotOptionStr',
    value: 'var result_as_boolean = util.isDeviceIotOptionStr(entityStr_as_string);',
    meta: 'static'
},
{
    caption: 'util.isImportIotOption',
    value: 'var result_as_boolean = util.isImportIotOption(entity_as_IotOption);',
    meta: 'static'
},
{
    caption: 'util.isImportIotOptionStr',
    value: 'var result_as_boolean = util.isImportIotOptionStr(entityStr_as_string);',
    meta: 'static'
},
{
    caption: 'variables.derefName',
    value: 'var result_as_string = variables.derefName(ref_as_string);',
    meta: 'static'
},
{
    caption: 'variables.derefTemplate',
    value: 'var result_as_string = variables.derefTemplate(templ_as_string);',
    meta: 'static'
},
{
    caption: 'variables.derefValue',
    value: 'var result_as_any = variables.derefValue(ref_as_string);',
    meta: 'static'
},
{
    caption: 'variables.exists',
    value: 'var result_as_boolean = variables.exists(name_as_string);',
    meta: 'static'
},
{
    caption: 'variables.read',
    value: 'var result_as_any = variables.read(name_as_string);',
    meta: 'static'
},
{
    caption: 'variables.ref',
    value: 'var result_as_string = variables.ref(name_as_string);',
    meta: 'static'
}
            ]);
        } else {
            callback(null, [
                {
    caption: 'outputs.set',
    value: 'outputs.set(name_as_string, value_as_any)',
    meta: 'static'
},
{
    caption: 'outputs.setJson',
    value: 'outputs.setJson(name_as_string, value_as_any)',
    meta: 'static'
},
{
    caption: 'variables.write',
    value: 'variables.write(name_as_string, value_as_any)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspect',
    value: 'deviceRepo.getAspect(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNode',
    value: 'deviceRepo.getAspectNode(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodes',
    value: 'deviceRepo.getAspectNodes()',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesByIdList',
    value: 'deviceRepo.getAspectNodesByIdList(ids_as_string_list)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesMeasuringFunctions',
    value: 'deviceRepo.getAspectNodesMeasuringFunctions(id_as_string, ancestors_as_boolean, descendants_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectNodesWithMeasuringFunction',
    value: 'deviceRepo.getAspectNodesWithMeasuringFunction(ancestors_as_boolean, descendants_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspects',
    value: 'deviceRepo.getAspects()',
    meta: 'static'
},
{
    caption: 'deviceRepo.getAspectsWithMeasuringFunction',
    value: 'deviceRepo.getAspectsWithMeasuringFunction(ancestors_as_boolean, descendants_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getCharacteristic',
    value: 'deviceRepo.getCharacteristic(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getConceptWithCharacteristics',
    value: 'deviceRepo.getConceptWithCharacteristics(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getConceptWithoutCharacteristics',
    value: 'deviceRepo.getConceptWithoutCharacteristics(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClass',
    value: 'deviceRepo.getDeviceClass(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClasses',
    value: 'deviceRepo.getDeviceClasses()',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesControllingFunctions',
    value: 'deviceRepo.getDeviceClassesControllingFunctions(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesFunctions',
    value: 'deviceRepo.getDeviceClassesFunctions(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceClassesWithControllingFunctions',
    value: 'deviceRepo.getDeviceClassesWithControllingFunctions()',
    meta: 'static'
},
{
    caption: 'deviceRepo.getDeviceTypeSelectables',
    value: 'deviceRepo.getDeviceTypeSelectables(query_as_FilterCriteria_list, pathPrefix_as_string, includeModified_as_boolean, servicesMustMatchAllCriteria_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getFunction',
    value: 'deviceRepo.getFunction(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getFunctionsByType',
    value: 'deviceRepo.getFunctionsByType(rdfType_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getLeafCharacteristics',
    value: 'deviceRepo.getLeafCharacteristics()',
    meta: 'static'
},
{
    caption: 'deviceRepo.getLocation',
    value: 'deviceRepo.getLocation(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.getService',
    value: 'deviceRepo.getService(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.listDeviceTypes',
    value: 'deviceRepo.listDeviceTypes(limit_as_number, offset_as_number, sort_as_string, filter_as_FilterCriteria_list, includeModified_as_boolean, includeUnmodified_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.listHubDeviceIds',
    value: 'deviceRepo.listHubDeviceIds(id_as_string, asLocalId_as_boolean)',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDevice',
    value: 'deviceRepo.readDevice(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceByLocalId',
    value: 'deviceRepo.readDeviceByLocalId(localId_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceGroup',
    value: 'deviceRepo.readDeviceGroup(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.readDeviceType',
    value: 'deviceRepo.readDeviceType(id_as_string)',
    meta: 'static'
},
{
    caption: 'deviceRepo.readHub',
    value: 'deviceRepo.readHub(id_as_string)',
    meta: 'static'
},
{
    caption: 'inputs.exists',
    value: 'inputs.exists(name_as_string)',
    meta: 'static'
},
{
    caption: 'inputs.get',
    value: 'inputs.get(name_as_string)',
    meta: 'static'
},
{
    caption: 'inputs.list',
    value: 'inputs.list()',
    meta: 'static'
},
{
    caption: 'inputs.listNames',
    value: 'inputs.listNames()',
    meta: 'static'
},
{
    caption: 'outputs.get',
    value: 'outputs.get(name_as_string)',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromEntityString',
    value: 'util.getDevicesWithServiceFromEntityString(entityStr_as_string, criteria_as_FilterCriteria_list)',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromIotOption',
    value: 'util.getDevicesWithServiceFromIotOption(entity_as_IotOption, criteria_as_FilterCriteria_list)',
    meta: 'static'
},
{
    caption: 'util.getDevicesWithServiceFromIotOption',
    value: 'util.getDevicesWithServiceFromIotOption(entity_as_IotOption, criteria_as_FilterCriteria_list)',
    meta: 'static'
},
{
    caption: 'util.getUserId',
    value: 'util.getUserId()',
    meta: 'static'
},
{
    caption: 'util.getUserToken',
    value: 'util.getUserToken()',
    meta: 'static'
},
{
    caption: 'util.groupIotOptionsByDevice',
    value: 'util.groupIotOptionsByDevice(entities_as_IotOption_list)',
    meta: 'static'
},
{
    caption: 'util.groupIotOptionsByService',
    value: 'util.groupIotOptionsByService(entities_as_IotOption_list)',
    meta: 'static'
},
{
    caption: 'util.isDeviceGroupIotOption',
    value: 'util.isDeviceGroupIotOption(entity_as_IotOption)',
    meta: 'static'
},
{
    caption: 'util.isDeviceGroupIotOptionStr',
    value: 'util.isDeviceGroupIotOptionStr(entityStr_as_string)',
    meta: 'static'
},
{
    caption: 'util.isDeviceIotOption',
    value: 'util.isDeviceIotOption(entity_as_IotOption)',
    meta: 'static'
},
{
    caption: 'util.isDeviceIotOptionStr',
    value: 'util.isDeviceIotOptionStr(entityStr_as_string)',
    meta: 'static'
},
{
    caption: 'util.isImportIotOption',
    value: 'util.isImportIotOption(entity_as_IotOption)',
    meta: 'static'
},
{
    caption: 'util.isImportIotOptionStr',
    value: 'util.isImportIotOptionStr(entityStr_as_string)',
    meta: 'static'
},
{
    caption: 'variables.derefName',
    value: 'variables.derefName(ref_as_string)',
    meta: 'static'
},
{
    caption: 'variables.derefTemplate',
    value: 'variables.derefTemplate(templ_as_string)',
    meta: 'static'
},
{
    caption: 'variables.derefValue',
    value: 'variables.derefValue(ref_as_string)',
    meta: 'static'
},
{
    caption: 'variables.exists',
    value: 'variables.exists(name_as_string)',
    meta: 'static'
},
{
    caption: 'variables.read',
    value: 'variables.read(name_as_string)',
    meta: 'static'
},
{
    caption: 'variables.ref',
    value: 'variables.ref(name_as_string)',
    meta: 'static'
}
            ]);
        }
    }
};

export {completer};
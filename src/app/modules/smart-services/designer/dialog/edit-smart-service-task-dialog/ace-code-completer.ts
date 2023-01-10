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

let Completer = {
    getCompletions: function(_: any, session: any, pos: any, ___: any, callback: any) {
        let line = session.doc.$lines[pos.row].slice(0, pos.column-1);
        const isNewStatement = line.trim().length == 0 || line.trim().endsWith(";");
        if(isNewStatement){
            callback(null, [
                {
    caption: "deviceRepo.GetAspect",
    value: "var result_as_Aspect = deviceRepo.GetAspect(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNode",
    value: "var result_as_AspectNode = deviceRepo.GetAspectNode(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodes",
    value: "var result_as_AspectNode_list = deviceRepo.GetAspectNodes();",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesByIdList",
    value: "var result_as_AspectNode_list = deviceRepo.GetAspectNodesByIdList(ids_as_string_list);",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesMeasuringFunctions",
    value: "var result_as_Function_list = deviceRepo.GetAspectNodesMeasuringFunctions(id_as_string, ancestors_as_bool, descendants_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesWithMeasuringFunction",
    value: "var result_as_AspectNode_list = deviceRepo.GetAspectNodesWithMeasuringFunction(ancestors_as_bool, descendants_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspects",
    value: "var result_as_Aspect_list = deviceRepo.GetAspects();",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectsWithMeasuringFunction",
    value: "var result_as_Aspect_list = deviceRepo.GetAspectsWithMeasuringFunction(ancestors_as_bool, descendants_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.GetCharacteristic",
    value: "var result_as_Characteristic = deviceRepo.GetCharacteristic(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetConceptWithCharacteristics",
    value: "var result_as_ConceptWithCharacteristics = deviceRepo.GetConceptWithCharacteristics(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetConceptWithoutCharacteristics",
    value: "var result_as_Concept = deviceRepo.GetConceptWithoutCharacteristics(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClass",
    value: "var result_as_DeviceClass = deviceRepo.GetDeviceClass(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClasses",
    value: "var result_as_DeviceClass_list = deviceRepo.GetDeviceClasses();",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesControllingFunctions",
    value: "var result_as_Function_list = deviceRepo.GetDeviceClassesControllingFunctions(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesFunctions",
    value: "var result_as_Function_list = deviceRepo.GetDeviceClassesFunctions(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesWithControllingFunctions",
    value: "var result_as_DeviceClass_list = deviceRepo.GetDeviceClassesWithControllingFunctions();",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceTypeSelectables",
    value: "var result_as_DeviceTypeSelectable_list = deviceRepo.GetDeviceTypeSelectables(query_as_FilterCriteria_list, pathPrefix_as_string, includeModified_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.GetFunction",
    value: "var result_as_Function = deviceRepo.GetFunction(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetFunctionsByType",
    value: "var result_as_Function_list = deviceRepo.GetFunctionsByType(rdfType_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetLeafCharacteristics",
    value: "var result_as_Characteristic_list = deviceRepo.GetLeafCharacteristics();",
    meta: "static"
},
{
    caption: "deviceRepo.GetLocation",
    value: "var result_as_Location = deviceRepo.GetLocation(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.GetService",
    value: "var result_as_Service = deviceRepo.GetService(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.ListDeviceTypes",
    value: "var result_as_DeviceType_list = deviceRepo.ListDeviceTypes(limit_as_int64, offset_as_int64, sort_as_string, filter_as_FilterCriteria_list, includeModified_as_bool, includeUnmodified_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.ListHubDeviceIds",
    value: "var result_as_string_list = deviceRepo.ListHubDeviceIds(id_as_string, asLocalId_as_bool);",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDevice",
    value: "var result_as_Device = deviceRepo.ReadDevice(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceByLocalId",
    value: "var result_as_Device = deviceRepo.ReadDeviceByLocalId(localId_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceGroup",
    value: "var result_as_DeviceGroup = deviceRepo.ReadDeviceGroup(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceType",
    value: "var result_as_DeviceType = deviceRepo.ReadDeviceType(id_as_string);",
    meta: "static"
},
{
    caption: "deviceRepo.ReadHub",
    value: "var result_as_Hub = deviceRepo.ReadHub(id_as_string);",
    meta: "static"
},
{
    caption: "inputs.Exists",
    value: "var result_as_bool = inputs.Exists(name_as_string);",
    meta: "static"
},
{
    caption: "inputs.Get",
    value: "var result_as_any = inputs.Get(name_as_string);",
    meta: "static"
},
{
    caption: "inputs.List",
    value: "var result_as_list = inputs.List();",
    meta: "static"
},
{
    caption: "inputs.ListNames",
    value: "var result_as_string_list = inputs.ListNames();",
    meta: "static"
},
{
    caption: "outputs.Get",
    value: "var result_as_any = outputs.Get(name_as_string);",
    meta: "static"
},
{
    caption: "variables.DerefName",
    value: "var result_as_string = variables.DerefName(ref_as_string);",
    meta: "static"
},
{
    caption: "variables.DerefTemplate",
    value: "var result_as_string = variables.DerefTemplate(templ_as_string);",
    meta: "static"
},
{
    caption: "variables.DerefValue",
    value: "var result_as_any = variables.DerefValue(ref_as_string);",
    meta: "static"
},
{
    caption: "variables.Exists",
    value: "var result_as_bool = variables.Exists(name_as_string);",
    meta: "static"
},
{
    caption: "variables.Read",
    value: "var result_as_any = variables.Read(name_as_string);",
    meta: "static"
},
{
    caption: "variables.Ref",
    value: "var result_as_string = variables.Ref(name_as_string);",
    meta: "static"
}
            ]);
        } else {
            callback(null, [
                {
    caption: "outputs.Set",
    value: "outputs.Set(name_as_string, value_as_any)",
    meta: "static"
},
{
    caption: "outputs.SetJson",
    value: "outputs.SetJson(name_as_string, value_as_any)",
    meta: "static"
},
{
    caption: "variables.Write",
    value: "variables.Write(name_as_string, value_as_any)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspect",
    value: "deviceRepo.GetAspect(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNode",
    value: "deviceRepo.GetAspectNode(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodes",
    value: "deviceRepo.GetAspectNodes()",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesByIdList",
    value: "deviceRepo.GetAspectNodesByIdList(ids_as_string_list)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesMeasuringFunctions",
    value: "deviceRepo.GetAspectNodesMeasuringFunctions(id_as_string, ancestors_as_bool, descendants_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectNodesWithMeasuringFunction",
    value: "deviceRepo.GetAspectNodesWithMeasuringFunction(ancestors_as_bool, descendants_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspects",
    value: "deviceRepo.GetAspects()",
    meta: "static"
},
{
    caption: "deviceRepo.GetAspectsWithMeasuringFunction",
    value: "deviceRepo.GetAspectsWithMeasuringFunction(ancestors_as_bool, descendants_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.GetCharacteristic",
    value: "deviceRepo.GetCharacteristic(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetConceptWithCharacteristics",
    value: "deviceRepo.GetConceptWithCharacteristics(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetConceptWithoutCharacteristics",
    value: "deviceRepo.GetConceptWithoutCharacteristics(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClass",
    value: "deviceRepo.GetDeviceClass(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClasses",
    value: "deviceRepo.GetDeviceClasses()",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesControllingFunctions",
    value: "deviceRepo.GetDeviceClassesControllingFunctions(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesFunctions",
    value: "deviceRepo.GetDeviceClassesFunctions(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceClassesWithControllingFunctions",
    value: "deviceRepo.GetDeviceClassesWithControllingFunctions()",
    meta: "static"
},
{
    caption: "deviceRepo.GetDeviceTypeSelectables",
    value: "deviceRepo.GetDeviceTypeSelectables(query_as_FilterCriteria_list, pathPrefix_as_string, includeModified_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.GetFunction",
    value: "deviceRepo.GetFunction(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetFunctionsByType",
    value: "deviceRepo.GetFunctionsByType(rdfType_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetLeafCharacteristics",
    value: "deviceRepo.GetLeafCharacteristics()",
    meta: "static"
},
{
    caption: "deviceRepo.GetLocation",
    value: "deviceRepo.GetLocation(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.GetService",
    value: "deviceRepo.GetService(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.ListDeviceTypes",
    value: "deviceRepo.ListDeviceTypes(limit_as_int64, offset_as_int64, sort_as_string, filter_as_FilterCriteria_list, includeModified_as_bool, includeUnmodified_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.ListHubDeviceIds",
    value: "deviceRepo.ListHubDeviceIds(id_as_string, asLocalId_as_bool)",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDevice",
    value: "deviceRepo.ReadDevice(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceByLocalId",
    value: "deviceRepo.ReadDeviceByLocalId(localId_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceGroup",
    value: "deviceRepo.ReadDeviceGroup(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.ReadDeviceType",
    value: "deviceRepo.ReadDeviceType(id_as_string)",
    meta: "static"
},
{
    caption: "deviceRepo.ReadHub",
    value: "deviceRepo.ReadHub(id_as_string)",
    meta: "static"
},
{
    caption: "inputs.Exists",
    value: "inputs.Exists(name_as_string)",
    meta: "static"
},
{
    caption: "inputs.Get",
    value: "inputs.Get(name_as_string)",
    meta: "static"
},
{
    caption: "inputs.List",
    value: "inputs.List()",
    meta: "static"
},
{
    caption: "inputs.ListNames",
    value: "inputs.ListNames()",
    meta: "static"
},
{
    caption: "outputs.Get",
    value: "outputs.Get(name_as_string)",
    meta: "static"
},
{
    caption: "variables.DerefName",
    value: "variables.DerefName(ref_as_string)",
    meta: "static"
},
{
    caption: "variables.DerefTemplate",
    value: "variables.DerefTemplate(templ_as_string)",
    meta: "static"
},
{
    caption: "variables.DerefValue",
    value: "variables.DerefValue(ref_as_string)",
    meta: "static"
},
{
    caption: "variables.Exists",
    value: "variables.Exists(name_as_string)",
    meta: "static"
},
{
    caption: "variables.Read",
    value: "variables.Read(name_as_string)",
    meta: "static"
},
{
    caption: "variables.Ref",
    value: "variables.Ref(name_as_string)",
    meta: "static"
}
            ]);
        }
    }
}

export {Completer}

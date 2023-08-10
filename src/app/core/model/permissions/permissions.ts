interface ListAfter {
    sort_field_value: any;
    id: string;
}

interface UrlValues {
    [key: string]: string[];
}

interface QueryListCommons {
    limit?: Number;
    offset?: Number;
    after?: ListAfter;
    rights?: string;
    sort_by?: string;
    sort_desc?: boolean;
    add_id_modifier?: UrlValues
}

interface Condition {
    feature: string;
    operation: "==" | "!=" | "any_value_in_feature"
    value: any;
    ref: string;
}

interface Selection {
    and?: Selection[];
    or?: Selection[];
    not?: Selection;
    condition: Condition;
}

interface QueryFind extends QueryListCommons {
    search: string;
    filter?: Selection;
}

interface QueryListIds extends QueryListCommons {
    ids: string[];
}

interface QueryCheckIds {
    ids: string[];
    rights: string;
}

export interface PermissionQueryRequest {
    resource: string;
    find?: QueryFind;
    list_ids?: QueryListIds;
    check_ids?: QueryCheckIds;
    term_aggregate?: string;
    term_aggregate_limit?: Number;
}
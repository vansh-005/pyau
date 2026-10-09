"""DynamoDB helpers (single table). Floats are stored as Decimal and converted back on read."""
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

_table = None


def table():
    global _table
    if _table is None:
        _table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
    return _table


def to_ddb(x):
    return json.loads(json.dumps(x), parse_float=Decimal)


def from_ddb(x):
    if isinstance(x, list):
        return [from_ddb(i) for i in x]
    if isinstance(x, dict):
        return {k: from_ddb(v) for k, v in x.items()}
    if isinstance(x, Decimal):
        return int(x) if x == x.to_integral_value() else float(x)
    return x


def put(pk, sk, data, **extra):
    table().put_item(Item=to_ddb({"PK": pk, "SK": sk, "data": data, **extra}))


def get(pk, sk):
    r = table().get_item(Key={"PK": pk, "SK": sk}, ConsistentRead=True).get("Item")
    return from_ddb(r["data"]) if r else None


def query(pk, sk_prefix=None):
    kc = Key("PK").eq(pk) & (Key("SK").begins_with(sk_prefix) if sk_prefix else Key("SK").gte(""))
    items, kw = [], {"KeyConditionExpression": kc, "ConsistentRead": True}
    while True:
        r = table().query(**kw)
        items += [from_ddb(i["data"]) for i in r["Items"]]
        if "LastEvaluatedKey" not in r:
            return items
        kw["ExclusiveStartKey"] = r["LastEvaluatedKey"]


def batch_put(items, ttl=None):
    with table().batch_writer() as w:
        for pk, sk, data in items:
            item = {"PK": pk, "SK": sk, "data": data}
            if ttl:
                item["ttl"] = ttl
            w.put_item(Item=to_ddb(item))

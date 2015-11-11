/*
Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Note: Other license terms may apply to certain, identified software files contained within or
distributed with the accompanying software if such terms are included in the directory containing
the accompanying software. Such other license terms will then apply in lieu of the terms of the
software license above.
*/
console.log('Loading event');

var DATA_TABLE = '<YOUR_DYNAMO_DB_TABLE>';
var EVENT = '<EVENT_ID>';

var AWS = require("aws-sdk");
var async = require("async");
var ddb = new AWS.DynamoDB();

exports.handler = function(event, context) {
  if (event.timestamp===undefined||event.timestamp==null||event.timestamp==0) {
    var rTimestamp = new Date().getTime();
  } else {
    var rTimestamp = event.timestamp;
  }
  var params = {
    TableName: DATA_TABLE,
    Select: 'SPECIFIC_ATTRIBUTES',
    AttributesToGet: ['RecordTimestamp','Coordinates'],
    KeyConditions: {
      EventID: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: EVENT }]
      },
      RecordTimestamp: {
        ComparisonOperator: 'GE',
        AttributeValueList: [{
          N: rTimestamp.toString()
        }]
      }
    }
  };

  ddb.query(params, function(err, data) {
    if (err) {
      console.log(err);
      context.fail(err);
    }
    else {
      console.log(this.data.Items);
      var response = [];
      for (var i in this.data.Items) {
         console.log(this.data.Items[i].Coordinates.S);
         response[i] = {
            timestamp: this.data.Items[i].RecordTimestamp.N,
            coordinates: JSON.parse(this.data.Items[i].Coordinates.S)
         };
      }
      context.succeed(response);
    }
  });
};

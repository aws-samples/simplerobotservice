console.log('Loading event');

var DATA_TABLE = '<YOUR_DYNAMO_DB_TABLE>';
var EVENT = '<EVENT_ID>';
var AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB();

exports.handler = function(event, context) {

    if (event.coordinates!==undefined) {

      var rTimestamp = new Date().getTime();
      console.log(rTimestamp);
      var params = {
        TableName: DATA_TABLE,
        Item:{
           "EventID":{"S": EVENT },
           "RecordTimestamp":{"N": rTimestamp.toString() },
           "Coordinates":{"S": JSON.stringify(event.coordinates)}
        }
      };

      ddb.putItem(params, function(err, result) {
          console.log(result);
          context.done(err, result);
      });

    } else {
      context.fail("JSON input [frameId or coordinates] not defined.");
    }

};

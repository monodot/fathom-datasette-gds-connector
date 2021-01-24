/**
 * Fathom Datasette Connector for Google Data Studio
 * Copyright (C) 2021 Tom Donohue
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

var cc = DataStudioApp.createCommunityConnector();

// This function needs to exist for some reason (even though it's not in the tutorial)
function isAdminUser() {
  return true;
}

function getAuthType() {
  return cc
    .newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}

function getConfig(request) {
  var config = cc.getConfig();
  
  config.newInfo()
    .setId('instructions')
    .setText('Enter details of Datasette data set to fetch.');
  
  config.newTextInput()
    .setId('baseUrl')
    .setName('Enter the base URL for the data set in Datasette')
    .setHelpText('e.g. https://datasette.example.com:8080/fathom');
  
  config.setDateRangeRequired(true);
  
  return config.build();
}

/**
 * Set up the dimensions and metrics that this connector will expose to GDS.
 */
function getFields(request) {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;
  
  fields.newDimension()
    .setId('timestamp')
    .setType(types.YEAR_MONTH_DAY_SECOND);

  fields.newDimension()
    .setId('pageviews')
    .setType(types.NUMBER);

  fields.newDimension()
    .setId('average_duration')
    .setType(types.NUMBER);
  
  fields.newDimension()
    .setId('bounce_rate')
    .setType(types.NUMBER);
  
  return fields;
}


function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}


function responseToRows(requestedFields, response, someParam) {
  // Take the response, and for each element in the array....
  //Logger.log(response);
  return response.map(function(hourlyStat) {
    var row = [];
    
    // for each field requested in the Data Studio report:
    requestedFields.asArray().forEach(function (field) {

      switch (field.getId()) {
        case 'timestamp':
          // Do some fudging to just return the digits from the date string
          return row.push(hourlyStat.ts.replace(/\D/g,''));
        case 'pageviews':
          return row.push(hourlyStat.pageviews);
        case 'average_duration':
          return row.push(hourlyStat.avg_duration);
        case 'bounce_rate':
          return row.push(hourlyStat.bounce_rate);
        default:
          return row.push('');
      }
    });
    return { values: row };
  });
}


function getData(request) {
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  //Logger.log("received request object: " + request);

  var url = [
    request.configParams.baseUrl,
    '.json?_shape=objects&sql=select+rowid%2C+site_id%2C+hostname_id%2C+pathname_id%2C+pageviews%2C+visitors%2C+entries%2C+bounce_rate%2C+known_durations%2C+avg_duration%2C+ts+from+page_stats',
    '+where+pathname_id+%3D+%2798%27+', // TODO change this to allow fetching of individual pages
    // TODO allow drill down by individual SITE (because at the moment it just fetches all sites from Fathom DB)
    'and+ts+%3E%3D+%27',
    request.dateRange.startDate,
    '%27',
    'and+ts+%3C%3D+%27',
    request.dateRange.endDate,
    '%27',
    '+order+by+ts+desc'
  ];
  
  var response = UrlFetchApp.fetch(url.join(''));
  var parsedResponse = JSON.parse(response.getContentText()).rows; // just get the .rows array from the JSON
  var rows = responseToRows(requestedFields, parsedResponse, 'foo');

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}


// TESTS...............................

if ((typeof GasTap)==='undefined') { // GasT Initialization. (only if not initialized yet.)
  var cs = CacheService.getScriptCache().get('gast');
  if(!cs){
    cs = UrlFetchApp.fetch('https://raw.githubusercontent.com/huan/gast/master/src/gas-tap-lib.js').getContentText();
    CacheService.getScriptCache().put('gast', cs, 21600);
  }
  eval(cs);
} // Class GasTap is ready for use now!

var test = new GasTap()

// TEST DATA:
// This is a sample request for the getData function
var sampleRequest = {
  configParams: {
    baseUrl: "https://datasette.example.com:8080/fathom"
  },
  dateRange: {
    startDate: '2021-01-01',
    endDate: '2021-01-23'
  },
  fields: [
    {
      name: "timestamp",
    },
    {
      name: "pageviews",
    },
    {
      name: "bounce_rate",
    },
    {
      name: "average_duration",
    }
  ]
}

function gastTestRunner() {
  test('returns some data', function (t) {
    var response = getData(sampleRequest);
    //Logger.log("response was: " + response.rows);
    //Logger.log(response.schema);
    //Logger.log(response.rows);

    t.ok(response, 'response was successful');
    t.ok(response.schema, 'schema is present');
    t.ok(response.rows, 'rows is present');
  });
  
  test.finish();
}


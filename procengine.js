/**
 * ProcEngine v1.1.0
 * @author Ahmed Khalifa (Amidos)
 */
var procengine = {
  ////////////////////////////Data Members//////////////////////////////////////
  /**
   * testing information for the system
   */
  testing:{
    /**
     * to make sure people call Initialize function before generate
     */
    isInitialized: false,
    /**
     * for debugging the engine
     */
    isDebug: true,
    /**
     * current number of objects spawned from this type
     */
    currentCounts: {},
  },
  /**
   * contains the initial information about the generated map
   */
  mapData: {
    /**
    * the size of the map [width x height]
    */
    mapSize: [],
    /**
    * the tile used to fill the map
    */
    mapStart: -1,
    /**
    * the tile used to dig through the map
    */
    mapDig: -1
  },
  /**
   * contains all the information about how to divide the map into rooms
   * and initializing them
   */
  roomData: {
    /**
     * type used for dividing the rooms
     */
    roomType: -1,
    /**
     * parameter used for the room divison technique
     */
    roomParameter: [],
    /**
     * number of rooms to be generated in the level
     */
    roomNumber: -1,
    /**
     * starting rules that is used to starting distribution
     */
    startingRules: [],
  },
  /**
   * the names and neighbourhoods idendified by the user
   */
  identifiedNames:{
    /**
     * dictionary contains all defined names and coressponding ids
     */
    namesIndex: {},
    /**
     * dictionary contains all defined ids and coressponding names
     */
    indexNames: {},
    /**
     * dictionary for the maximum size for each tile type
     */
    maxCounts: {},
    /**
     * dictionary for all the defined neigbourhoods
     */
    neigbourhoods: {}
  },
  /**
   * all the cellular automata used to generate the map
   */
  generationRules: [],
  ///////////////////////////////Classes////////////////////////////////////////
  /**
   * Condition is an enumarator with multiple values
   */
  Condition: {
    "<=": 0,
    ">=": 1,
    ">": 2,
    "<": 3,
    "==": 4,
    "!=": 5
  },
  /**
   * Shows how the condition is handled by anding them or by oring them
   */
  ConditionType: {
    "and": 0,
    "or": 1
  },
  /**
   * Type to treat isolated areas
   */
  ConnectionType: {
    "connect":0,
    "delete":1
  },
  /**
   * used to determine the type of map division
   */
  RoomType: {
    "equal": 0,
    "tree": 1
  },
  /**
   * used to determine how the generation rules will be applied
   * on all the map or on each room
   */
  GenerationType: {
    "map": 0,
    "room": 1
  },
  /**
   * ReplacingRule class contains data about inserting a tile using probabilities
   * @param dataLine {string} "tile:probability"
   * @member tile {Number} the tile that should appear in a specific tile
   * @member probability {Number} the probability of this tile to show
   * @function toString {String} return a string that contains all the data
   */
  ReplacingRule: function(dataLine){
    var pieces = dataLine.split(":");
    this.tile = procengine.identifiedNames.namesIndex[pieces[0].trim().toLowerCase()];
    this.probability = parseFloat(pieces[1].trim());
    this.toString = function(){
      return procengine.identifiedNames.indexNames[this.tile] + ":" + this.probability.toString();
    };
  },
  /**
   * ConditionRule class contains data about condition for cellular automata
   * @param dataLine {String} "tile condition value"
   * @member condition {Condition} the comparison type (>,<,>=,<=,==,!=)
   * @member tile {Number} the tile type to check
   * @member value {Number} the value to check with
   * @function toString {String} return a string that contains all the data
   */
  ConditionRule: function(dataLine){
    var pieces = [];
    for(var c in procengine.Condition){
      pieces = dataLine.trim().split(c);
      if(pieces.length > 1){
        this.condition = procengine.Condition[c];
        this.tile = procengine.identifiedNames.namesIndex[pieces[0].toLowerCase().trim()];
        this.value = parseInt(pieces[1].trim());
        break;
      }
    }
    this.toString = function(){
      return procengine.identifiedNames.indexNames[this.tile] + ":" + this.condition + ":" + this.value;
    }
  },
  /**
   * Rule class contains data about cellular automata rules
   * @param dataLine {string} "tile,neighbourhood,ConditionType,
   *                           ConditionRule|ConditionRule|...,
   *                           ReplacingRule|ReplacingRule|..."
   * @member tile {Number} if the current x,y is this tile
   * @member neighbourhood {Number[][]} the positions of tiles to check
   * @member conditionType {ConditionType} "or" if the condition rules are ored together or
   *                                       "and" if the condition rules are anded together
   * @member conditions {ConditionRule[]} the condition rules to be checked
   * @member replacingRules {ReplacingRule[]} the rules that are used in applying
   * @function toString {String} return a string that contains all the data
   */
  Rule: function(dataLine){
    var pieces = dataLine.split(",");
    this.tile = procengine.identifiedNames.namesIndex[pieces[0].trim().toLowerCase()];
    this.neighbourhood = procengine.identifiedNames.neigbourhoods[pieces[1].trim().toLowerCase()];
    this.conditionType = procengine.ConditionType[pieces[2].trim().toLowerCase()];
    var parts = pieces[3].split("|");
    this.conditions = [];
    for(var i=0; i < parts.length; i++){
      this.conditions.push(new procengine.ConditionRule(parts[i].trim()));
    }
    parts = pieces[4].split("|");
    this.replacingRules = [];
    for (var i = 0; i < parts.length; i++) {
      this.replacingRules.push(new procengine.ReplacingRule(parts[i]));
    }
    procengine.fixRulesProbability(this.replacingRules,
      procengine.getTotalProbability(this.replacingRules));
    this.toString = function(){
      return procengine.identifiedNames.indexNames[this.tile] + " " +
        procengine.identifiedNames.indexNames[this.conditionType] + " " + 
        "[" + this.conditions.toString() + "] " +
        "[" + this.replacingRules.toString() + "]";
    };
  },
  /**
   * UnconnectedRule class contains data for the for how to handle islands
   * @param dataLine {String} "ConnectionType:neighbourhood:Thickness"
   * @member connectionType {ConnectionType} The type of solving unconnected islands "connect" or "delete"
   * @member connectionCheck {Number[][]} The neighbourhood that is used to check if the islands are
   *                                      connected or not
   * @member connectionThickness {Number} Only valid if the connectionType is "connect" and it define
   *                                      how thick the line that connects
   * @function toString {String} return a string that contains all the data
   */
  UnconnectedRule: function(dataLine){
    var pieces = dataLine.trim().split(":");
    this.connectionType = procengine.ConnectionType[pieces[0].toLowerCase().trim()];
    this.connectionCheck = procengine.identifiedNames.neigbourhoods[pieces[1].toLowerCase().trim()];
    if(this.connectionType == procengine.ConnectionType["connect"]){
      this.connectionThickness = parseInt(pieces[2].trim());
    }
    this.toString = function(){
      return this.connectionType + " [" + this.connectionCheck + "]";
    }
  },
  /**
   * GenerationRule class contain data about the used cellular automata
   * @param dataObject {Object} {"genData":["simulationNumber", 
   *                             "generationType:generationParameter,generationParameter,...",
   *                             "UnconnectedRule"], 
   *                             "rules":["Rule", "Rule", ...]}
   * @member simulationNumber {Number} number of simulations
   * @member generationType {GenerationType} defines how the cellular automata will be applied 
   *                                         either "map" or "room"
   * @member generationParameter {Number[]} parameters used by the generationType
   * @member unconnectedRule {UnconnectedRule} shows how the current cellular automata deals with islands
   * @member rules {Rule[]} list of the rules that will be applied during using cellular automata 
   * @function toString {String} return a string that contains all the data
   */
  GenerationRule: function(dataObject){
    this.simulationNumber = 0;
    this.generationType = procengine.GenerationType["room"];
    this.generationParameter = [-1];
    this.unconnectedRule = new procengine.UnconnectedRule("connect:plus:1");

    if(dataObject.hasOwnProperty("genData")){
      this.simulationNumber = parseInt(dataObject["genData"][0].trim());
      var pieces = dataObject["genData"][1].trim().split(":");
      this.generationType = procengine.GenerationType[pieces[0].toLowerCase()];
      pieces = pieces[1].toLowerCase().split(",");
      this.generationParameter = [];
      for(var i = 0; i < pieces.length; i++){
        this.generationParameter.push(parseInt(pieces[i].trim()));
      }
      this.unconnectedRule = new procengine.UnconnectedRule(dataObject["genData"][2].trim());
    }

    this.rules = [];
    if(dataObject.hasOwnProperty("rules")){
      for(var i=0; i < dataObject["rules"].length; i++){
        this.rules.push(new procengine.Rule(dataObject["rules"][i]));
      }
    }

    this.toString = function(){
      return "[simNum:" + this.simulationNumber + " " + 
        "genType:" + this.generationType + " " + 
        "genParam:" + this.generationParameter + "\n" + 
        "connection:" + this.unconnectedRule + "\n" + 
        "rules:[" + this.rules.toString() + "]]";
    }
  },
  /**
   * Point data structure
   * @param x
   * @param y
   * @member x
   * @member y
   * @function clone {Point}
   */
  Point: function(x, y){
    this.x = x;
    this.y = y;
    this.clone = function(){
      return new procengine.Point(this.x, this.y);
    }
  },
  /**
   * Rectangle class to handle a rectangle data
   * @param x {Number} x position for the rectangle
   * @param y {Number} y position for the rectangle
   * @param width {Number} rectangle width
   * @param height {Number} rectangle height
   * @member x {Number} x position for the rectangle
   * @member y {Number} y position for the rectangle
   * @member width {Number} rectangle width
   * @member height {Number} rectangle height
   */
  Rectangle: function(x, y, width, height){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  },
  //////////////////////////Private Functions///////////////////////////////////
  /**
   * Gets a random integer number
   * @param max {Number} maximum boundary
   * @returns {Number} random integer number
   */
  randomInt: function(max){
    return Math.floor(Math.random() * max);
  },
  /**
   * get the sign of the number
   * @param number {Number} the current number to check
   * @returns {Number} the sign of the number (+1, -1, 0)
   */
  sign: function(number){
    if(number > 0) return 1;
    if(number < 0) return -1;
    return 0;
  },
  /**
   * Shuffle array elements in place
   * @param array {Object[]} the array required to be shuffled
   */
  shuffleArray: function(array){
    for(var i=0; i<array.length; i++){
      var i1 = procengine.randomInt(array.length);
      var i2 = procengine.randomInt(array.length);
      if(Math.random() < 0.5){
        var temp = array[i1];
        array[i1] = array[i2];
        array[i2] = temp;
      }
    }
  },
  /**
   * get the biggest label in the map
   * @param labeledPoints {Point[][]} the labeledPoints on the map
   * @returns {Number} the label of the largest area
   */
  getBiggestLabel(labeledPoints){
    var result = -1;
    var maxLength = 0;
    for (var i = 0; i < labeledPoints.length; i++) {
      if(labeledPoints[i].length > maxLength){
        result = i;
        maxLength = labeledPoints[i].length;
      }
    }
    return result;
  },
  /**
   * Check if the x and y are in the array
   * @param x {Number} the x position to Check
   * @param y {Number} the y position to Check
   * @param array {Point[]} the array to Check
   * @returns {boolean} if the point exisits in the array
   */
  pointInArray: function(x, y, array){
    for (var i = 0; i < array.length; i++) {
      if(x == array[i].x && y == array[i].y){
        return true;
      }
    }
    return false;
  },
  /**
   * append the second array to the first array
   * @param array1 {Obejct[]} first array
   * @param array2 {Object[]} second array
   */
  appendArray(array1, array2){
    for (var i = 0; i < array2.length; i++) {
      array1.push(array2[i]);
    }
  },
  /**
   * Get the total sum of probability attribute in the rules array
   * @param rules {ReplacingRule[]} an array of ReplacingRule
   * @returns {Number} total sum of probabilities of the replacing rules
   */
  getTotalProbability: function(rules){
    var totalValue = 0;
    for (var i = 0; i < rules.length; i++) {
      totalValue += rules[i].probability;
    }
    return totalValue;
  },
  /**
   * Changing the values to probabilities
   * @param rules {ReplacingRule[]} an array of ReplacingRule
   * @param totalValue {Number} the total summation of probabilities in the rules
   */
  fixRulesProbability: function(rules, totalValue){
    for (var i = 0; i < rules.length; i++) {
      rules[i].probability /= totalValue;
    }
  },
  /**
   * parse neighbourhood data into 2D matrix
   * @param dataLine {string} a comma separated string for each row in the matrix
   * @returns {Number[][]} 2D matrix of 1s and 0s which define the neighbourhood
   */
  parseNeighbourhood: function(dataLine){
    var pieces = dataLine.split(",");
    var result = [];
    for(var j=0; j<pieces.length; j++){
      var line = pieces[j];
      result.push([]);
      for(var i=0; i<line.length; i++){
        var bit = parseInt(line.trim().charAt(i));
        result[result.length - 1].push(bit);
      }
    }
    return result;
  },
  /**
   * Flood fill the map starting from the point x, y
   * @param map {Number[][]} the current labeled map
   * @param x {Number} the current x position to flood
   * @param y {Number} the current y position to floodFill
   * @param connection {Number[][]} connection type
   * @param currentLabel {Number} the current label
   */
  floodFill: function(map, x, y, connection, currentLabel){
    if(x < 0 || y < 0 || x >= map[0].length || y >= map.length || map[y][x] != 0){
      return;
    }
    map[y][x] = currentLabel;
    var center = new procengine.Point(Math.floor(connection[0].length / 2),
      Math.floor(connection.length / 2));
    for (var i = 0; i < connection.length; i++) {
      for (var j = 0; j < connection[i].length; j++) {
        if(connection[i][j] == 1){
          procengine.floodFill(map, x + j - center.x, y + i - center.y,
            connection, currentLabel);
        }
      }
    }
  },
  /**
   * label the map and get the results
   * @param map {Number[][]} the current map
   * @param connection {Number[][]} direction of connection for tiles
   * @param mapStart (Number) the inpassable tile
   * @returns {Point[][]} a 2D array contains all the points with labels
   */
  labelMap: function(map, rect, connection, mapStart){
    var tempMap = [];
    for (var y = 0; y < rect.height; y++) {
      tempMap.push([]);
      for (var x = 0; x < rect.width; x++) {
        tempMap[y].push(0);
        if(map[y + rect.y][x + rect.x] == mapStart){
          tempMap[y][x] = -1;
        }
      }
    }

    var currentLabel = 0;
    for (var y = 0; y < tempMap.length; y++) {
      for (var x = 0; x < tempMap[y].length; x++) {
        if(tempMap[y][x] == 0){
          currentLabel += 1;
          procengine.floodFill(tempMap, x, y, connection, currentLabel);
        }
      }
    }

    var result = [];
    for (var i = 0; i < currentLabel; i++) {
      result.push([]);
    }

    for (var y = 0; y < tempMap.length; y++) {
      for (var x = 0; x < tempMap[y].length; x++) {
        if(tempMap[y][x] != -1){
          result[tempMap[y][x] - 1].push(new procengine.Point(x + rect.x, y + rect.y));
        }
      }
    }

    return result;
  },
  /**
   * debugging printing function
   * @param map {Number[][]} the current map
   */
  printDebugMap: function(map){
    if(!procengine.testing.isDebug){
      return;
    }

    var result = "";
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        if(map[y][x] < 0) {
          result += "#";
        }
        else{
          result += map[y][x].toString();
        }
      }
      result += "\n";
    }
    console.log(result);
  },
  /**
   * generate the starting map
   * @returns {Number[][]} 2D array of mapStart tile index
   */
  getStartingMap: function(){
    var map = [];
    for (var y = 0; y < procengine.mapData.mapSize[1]; y++) {
      map.push([]);
      for (var x = 0; x < procengine.mapData.mapSize[0]; x++) {
        map[y].push(procengine.mapData.mapStart);
      }
    }
    return map;
  },
  /**
   * Get the rooms using equal splitting
   * @param map {Number[][]} the current map to be modified
   * @param numX {Number} the number of splits in the x axis
   * @param numY {Number} the number of splits in the y axis
   * @param numRooms {Number} the numbers of rooms
   * @returns {Rectangle[]} list of the rooms that 
   */
  getEqualRooms: function(map, numX, numY, numRooms){
    var w = Math.floor(map[0].length / numX);
    var h = Math.floor(map.length / numY);
    var rooms = [];
    for(var x=0; x<numX; x++){
      for(var y=0; y<numY; y++){
        rooms.push(new procengine.Rectangle(x * w + 1, y * h + 1, w - 2, h - 2));
      }
    }

    while(rooms.length > numRooms){
      var i = procengine.randomInt(rooms.length);
      rooms.splice(i, 1);
    }

    return rooms;
  },
  /**
   * Get the rooms using tree based splitting
   * @param map {Number[][]} the current map to be modified
   * @param minW {Number} the minimum width
   * @param minH {Number} the minimum height
   * @param numRooms {Number} the number of rooms
   * @returns {Rectangle[]} list of the rooms after division
   */
  getTreeRooms: function(map, minW, minH, numRooms){
    var rooms = [new procengine.Rectangle(1, 1, map[0].length - 2, map.length - 2)];

    while(rooms.length < numRooms){
      var index = procengine.getSuitableRoom(rooms, minW, minH);
      var r = rooms[index];
      rooms.splice(index, 1);
      if(r.width > r.height){
        if(r.width > 2 * minW){
          var width = minW + procengine.randomInt(r.width - 2 * minW);
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + 1, width - 2, r.height - 2));
          rooms.push(new procengine.Rectangle(r.x + width + 2, r.y + 1, r.width - width - 2, r.height - 2));
        }
        else{
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + 1, r.width/2 - 2, r.height - 2));
          rooms.push(new procengine.Rectangle(r.x + r.width/2 + 2, r.y + 1, r.width/2 - 2, r.height - 2));
        }
      }
      else{
        if(r.height > 2 * minH){
          var height = minH + procengine.randomInt(r.height - 2 * minH);
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + 1, r.width - 2, height - 2));
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + height + 1, r.width - 2, r.height - height - 2));
        }
        else{
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + 1, r.width - 2, r.height/2 - 2));
          rooms.push(new procengine.Rectangle(r.x + 1, r.y + r.height/2 + 2, r.width - 2, r.height/2 - 2));
        }
      }
    }

    return rooms;
  },
  /**
   * get the suitable room to split based on the size (bigger rooms have higher chance)
   * @param rooms {Rectangle[]} list of all rooms
   * @param minW {Number} minimum width to divide
   * @param minH {Number} minimum height to divide
   * @returns {Number} the best room index to split
   */
  getSuitableRoom: function(rooms, minW, minH){
    var suitRooms = [];
    var previousValue = 0;
    for(var i=0; i<rooms.length; i++){
      if(rooms[i].width > minW || rooms[i].height > minH){
        suitRooms.push(new procengine.Point(i, previousValue + rooms[i].width * rooms[i].height));
        previousValue = suitRooms[suitRooms.length - 1].y;
      }
    }

    var randomValue = procengine.randomInt(previousValue);
    for(var i=0; i<suitRooms.length; i++){
      if(randomValue < suitRooms[i].y){
        return suitRooms[i].x;
      }
    }

    return procengine.randomInt(rooms.length);
  },
  /**
   * Dig the map to construct rooms where cellular automata can be applied
   * @param map {Number[][]} the current map to be modified
   * @returns {Rectangle[]} array of all the rooms to be adjusted
   */
  getRooms: function(map){
    var rooms = [new procengine.Rectangle(1, 1, procengine.mapData.mapSize[0] - 2, procengine.mapData.mapSize[1] - 2)]
    if(procengine.roomData.roomType == procengine.RoomType["equal"]){
      rooms = procengine.getEqualRooms(map, procengine.roomData.roomParameter[0], 
        procengine.roomData.roomParameter[1], procengine.roomData.roomNumber);
    }
    else if(procengine.roomData.roomType == procengine.RoomType["tree"]){
      rooms = procengine.getTreeRooms(map, procengine.roomData.roomParameter[0], 
        procengine.roomData.roomParameter[1], procengine.diggerInfo.roomNumber);
    }

    return rooms;
  },
  /**
   * connect unconnected objects in a certain room
   * @param map {Number[][]} the current map to be modified
   * @param rect {Rectangle} the current selected room
   * @param fixType {Unconnected} how to handle unconnected areas
   */
  fixUnconnected: function(map, rect, fixType, neighbourhood, thickness){
    var labeledData = procengine.labelMap(map, rect, neighbourhood, procengine.mapData.mapStart);
    if(fixType == procengine.ConnectionType["delete"]){
      var largestLabel = procengine.getBiggestLabel(labeledData);
      for (var i = 0; i < labeledData.length; i++) {
        if(i == largestLabel){
          continue;
        }
        for (var j = 0; j < labeledData[i].length; j++) {
          var point = labeledData[i][j];
          map[point.y][point.x] = procengine.mapData.mapStart;
        }
      }
    }
    if(fixType == procengine.ConnectionType["connect"]){
      while(labeledData.length > 1){
        var i1 = procengine.randomInt(labeledData.length);
        var i2 = (i1 + procengine.randomInt(labeledData.length - 1) + 1) % labeledData.length;
        var p1 = labeledData[i1][procengine.randomInt(labeledData[i1].length)].clone();
        var p2 = labeledData[i2][procengine.randomInt(labeledData[i2].length)].clone();
        if(Math.random() < 0.5){
          labeledData.splice(i1, 1);
        }
        else{
          labeledData.splice(i2, 1);
        }

        if(Math.random() < 0.5){
          var temp = p2;
          p2 = p1;
          p1 = temp;
        }
        if(Math.random() < 0.5){
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            procengine.sign(p2.x - p1.x), 0), procengine.mapData.mapStart,
            procengine.mapData.mapDig, thickness);
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            0, procengine.sign(p2.y - p1.y)), procengine.mapData.mapStart,
            procengine.mapData.mapDig, thickness);
        }
        else{
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            0, procengine.sign(p2.y - p1.y)), procengine.mapData.mapStart,
            procengine.mapData.mapDig, thickness);
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            procengine.sign(p2.x - p1.x), 0), procengine.mapData.mapStart,
            procengine.mapData.mapDig, thickness);
        }
      }
    }
  },
  /**
   * connect the map between p1 and p2
   * @param p1 {Point} the first position
   * @param p2 {Point} the second position
   * @param dir {Point} the direction of connection
   * @param mapStart {Number} impassable tile
   * @param mapDig {Number} passable tile
   * @param thickness (Number) the thickness of the connection
   */
  connectPoints: function(map, p1, p2, dir, mapStart, mapDig, thickness){
    var startThickness = Math.floor((thickness - 1) / 2);
    if(dir.x != 0){
      while(p1.y + thickness - startThickness <= 0){
        startThickness -= 1;
      }
      while(p1.y + thickness - startThickness >= map.length - 1){
        startThickness += 1;
      }
      while(p1.x != p2.x){
        for(var y=0;y<thickness;y++){
          if(map[p1.y + y - startThickness][p1.x] == mapStart){
            map[p1.y + y - startThickness][p1.x] = mapDig;
          }
        }
        p1.x += dir.x;
      }
    }
    if(dir.y != 0){
      while(p1.x + thickness - startThickness <= 0){
        startThickness -= 1;
      }
      while(p1.x + thickness - startThickness >= map[0].length - 1){
        startThickness += 1;
      }
      while(p1.y != p2.y){
        for(var x=0;x<thickness;x++){
          if(map[p1.y][p1.x + x - startThickness] == mapStart){
            map[p1.y][p1.x + x - startThickness] = mapDig;
          }
        }
        p1.y += dir.y;
      }
    }
  },
  /**
   * Apply cellular automata to couple of rectangles
   * @param map {Number[][]} the map need to be modified
   * @param simNumber {Number} number of simulations
   * @param rects {Rectangle[]} an array of rooms
   * @param startingRules {ReplacingRule[]} the intializing rules for the
   *                     cellular automata
   * @param rules {Rule[]} the cellular automata rules
   */
  applyCellularAutomata: function(map, simNumber, rects, rules){
    for (var i = 0; i < rects.length; i++) {
      var rect = rects[i];
      for (var s = 0; s < simNumber; s++) {
        procengine.roomSimulate(map, rect, rules);
        if(procengine.testing.isDebug){
          console.log("Room " + i.toString() + " at simulation " + s.toString() + ":\n");
          procengine.printDebugMap(map);
        }
      }
    }
  },
  /**
   * Apply Generation Rule on the map
   * @param map {Number[][]} the map to be modified
   * @param rooms {Rectangle[]} the current rooms geenrated from the division algorithm
   * @param generationRule {GenerationRule} the current generation rule to be applied
   */
  applyGenerationRule: function(map, rooms, generationRule){
    var rects = [];
    if(generationRule.generationType == procengine.GenerationType["map"]){
      rects = [new procengine.Rectangle(0, 0, map[0].length, map.length)];
      if(generationRule.generationParameter[0] != -1){
        rects = [new procengine.Rectangle(generationRule.generationParameter[0], 
          generationRule.generationParameter[1], generationRule.generationParameter[2], 
          generationRule.generationParameter[3])];
      }
    }
    else if(generationRule.generationType == procengine.GenerationType["room"]){
      var rects = rooms;
      if(generationRule.generationParameter[0] != -1){
        rects = [];
        for(var i=0; i<generationRule.generationParameter.length; i++){
          rects.push(rooms[i]);
        }
      }
    }

    this.applyCellularAutomata(map, generationRule.simulationNumber, rects, generationRule.rules);
    if(procengine.testing.isDebug){
      console.log("After applying cellular automata:\n");
      procengine.printDebugMap(map);
    }

    for(var i=0; i<rects.length; i++){
      procengine.fixUnconnected(map, rects[i], 
        generationRule.unconnectedRule.connectionType, generationRule.unconnectedRule.connectionCheck,
        generationRule.unconnectedRule.connectionThickness);
      if(procengine.testing.isDebug){
        console.log("After using connection Method on Room " + i.toString() + ":\n");
        procengine.printDebugMap(map);
      }
    }
  },
  /**
   * initialize the room based on the starting rules
   * @param map {Number[][]} the current map to be modified
   * @param rect {Rectangle} the current room dimension
   * @param rules {ReplacingRule[]} an array of ReplacingRule to be applied
   */
  roomInitialize: function(map, rect, rules){
    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        procengine.applyRule(map, x, y, rules);
      }
    }
  },
  /**
   * Apply one simulation run on a certain area
   * @param map {Number[][]} the current map
   * @param rect {Rectangle} the specific area need to be altered
   * @param rules {Rule[]} the rules of the cellular automata
   */
  roomSimulate: function(map, rect, rules){
    var tempMap = [];
    for (var i = 0; i < map.length; i++) {
      tempMap.push([]);
      for (var j = 0; j < map[i].length; j++) {
        tempMap[i].push(map[i][j]);
      }
    }

    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        for (var i = 0; i < rules.length; i++) {
          if(map[y][x] == rules[i].tile && procengine.checkRule(map, x, y, rules[i])){
            procengine.applyRule(tempMap, x, y, rules[i].replacingRules);
          }
        }
      }
    }

    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        map[y][x] = tempMap[y][x];
      }
    }
  },
  /**
   * Check if a condition is true or false
   * @param value {Number} the current value to be compared
   * @param conditionRule {ConditionRule} the condition to check
   * @returns {boolean} true if the condition is true and false otherwise
   */
  checkCondition: function(value, conditionRule){
    if(conditionRule.condition == procengine.Condition[">"]){
      return value > conditionRule.value;
    }
    else if(conditionRule.condition == procengine.Condition["<"]){
      return value < conditionRule.value;
    }
    else if(conditionRule.condition == procengine.Condition[">="]){
      return value >= conditionRule.value;
    }
    else if(conditionRule.condition == procengine.Condition["<="]){
      return value <= conditionRule.value;
    }
    else if(conditionRule.condition == procengine.Condition["=="]){
      return value == conditionRule.value;
    }
    else if(conditionRule.condition == procengine.Condition["!="]){
      return value != conditionRule.value;
    }
    return false;
  },
  /**
   * check if the rule can be applied on this tile
   * @param map {Number[][]} the current map
   * @param x {Number} the current x location
   * @param y {Number} the current y location
   * @param rule {Rule} the current rule to check
   * @returns {boolean} true it can be applied and false otherwise
   */
  checkRule: function(map, x, y, rule){
    var centerY = Math.floor(rule.neighbourhood.length / 2);
    var centerX = Math.floor(rule.neighbourhood[0].length / 2);
    var values = [];
    for(var i=0; i<rule.conditions.length; i++){
      values.push(0);
    }

    for (var iy = 0; iy < rule.neighbourhood.length; iy++) {
      for (var ix = 0; ix < rule.neighbourhood[iy].length; ix++) {
        var tempY = y - centerY + iy;
        var tempX = x - centerX + ix;
        if(tempY >= map.length || tempY < 0 || tempX >= map[iy].length || tempX < 0){
          continue;
        }
        for(var i=0; i<rule.conditions.length; i++){
          if(rule.neighbourhood[iy][ix] != 0 &&
            map[tempY][tempX] == rule.conditions[i].tile){
            values[i] += 1;
          }
        }
      }
    }
    
    if(rule.conditionType == procengine.ConditionType["and"]){
      for(var i=0; i<rule.conditions.length; i++){
        if(!procengine.checkCondition(values[i], rule.conditions[i])){
          return false;
        }
      }
      return true;
    }
    if(rule.conditionType == procengine.ConditionType["or"]){
      for(var i=0; i<rule.conditions.length; i++){
        if(procengine.checkCondition(values[i], rule.conditions[i])){
          return true;
        }
      }
      return false;
    }
    return false;
  },
  /**
   * Apply a group of replacing rules on a certain tile
   * @param map {Number[][]} the current map
   * @param x {Number} the current x location
   * @param y {Number} the current y location
   * @param rules {ReplacingRule[]} the replacing rules to be applied
   */
  applyRule: function(map, x, y, rules){
    var randomValue = Math.random();
    var amountValue = 0;
    for (var i = 0; i < rules.length; i++) {
      amountValue += rules[i].probability;
      if(randomValue < amountValue){
        if(procengine.identifiedNames.maxCounts[rules[i].tile] == -1 ||
          procengine.testing.currentCounts[rules[i].tile] < 
          procengine.identifiedNames.maxCounts[rules[i].tile]){
            map[y][x] = rules[i].tile;
            procengine.testing.currentCounts[rules[i].tile] += 1;
          }
        break;
      }
    }
  },
  /**
   * Get generated map that use maps
   * @param map {Number[][]} the current generated map
   * @param {string[][]} map using the names defined
   */
  getNamesMap: function(map){
    var tempMap = [];
    for (var i = 0; i < map.length; i++) {
      tempMap.push([]);
      for (var j = 0; j < map[i].length; j++) {
        tempMap[i].push(procengine.identifiedNames.indexNames[map[i][j]]);
      }
    }
    return tempMap;
  },
  //////////////////////////Public Functions////////////////////////////////////
  /**
   * initialize the whole framework with new data
   * @param data {Object} have the following fields
   *                      {
   *                        "mapData": ["widthxheight", "mapStart:mapDig"],
   *                        "roomData": ["roomType:parameters:numRooms", "StartingRule|StartingRule|..."],
   *                        "names": ["Name:MaxCount", "Name:MaxCount", ...],
   *                        "neighbourhoods": {"Name":"Neighboorhood", "Name":"Neighboorhood", ...},
   *                        "generationRules": [GenerationRule, GenerationRule, ...]
   *                      }
   */
  initialize: function(data){
    procengine.mapData.mapSize = [];
    procengine.mapData.mapStart = 0;
    procengine.mapData.mapDig = 0;
    procengine.roomData.roomType = procengine.RoomType["equal"];
    procengine.roomData.roomParameter = [];
    procengine.roomData.roomNumber = 1;
    procengine.roomData.startingRules = [];
    procengine.identifiedNames.namesIndex = {};
    procengine.identifiedNames.indexNames = {};
    procengine.identifiedNames.maxCounts = {};
    procengine.identifiedNames.neigbourhoods = {};
    procengine.generationRules = [];

    if(data.hasOwnProperty("names")){
      var index = 0;
      for(var i = 0; i < data["names"].length; i++) {
        var pieces = data["names"][i].split(":");
        procengine.identifiedNames.namesIndex[pieces[0].trim().toLowerCase()] = index;
        procengine.identifiedNames.indexNames[index] = pieces[0].trim().toLowerCase();
        procengine.identifiedNames.maxCounts[index] = parseInt(pieces[1].trim());
        index+=1;
      }
    }
    else{
      procengine.identifiedNames.namesIndex = {"solid":0, "empty":1};
      procengine.identifiedNames.indexNames = {"0":"solid", "1":"empty"};
      procengine.identifiedNames.maxCounts = {"0":"-1", "1":"-1"};
    }

    if(data.hasOwnProperty("neighbourhoods")){
      for(var key in data["neighbourhoods"]){
        procengine.identifiedNames.neigbourhoods[key.trim().toLowerCase()] =
          procengine.parseNeighbourhood(data["neighbourhoods"][key]);
      }
    }
    else{
      procengine.identifiedNames.neigbourhoods = {
        "plus": procengine.parseNeighbourhood("010,101,010"),
        "all": procengine.parseNeighbourhood("111","101","111")
      };
    }

    if(data.hasOwnProperty("mapData")){
      var pieces = data["mapData"][0].toLowerCase().split("x");
      procengine.mapData.mapSize.push(parseInt(pieces[0]));
      procengine.mapData.mapSize.push(parseInt(pieces[1]));
      pieces = data["mapData"][1].split(":");
      procengine.mapData.mapStart = procengine.identifiedNames.namesIndex[pieces[0].toLowerCase()];
      procengine.mapData.mapDig = procengine.identifiedNames.namesIndex[pieces[1].toLowerCase()];
    }
    else{
      procengine.mapData.mapSize.push(15);
      procengine.mapData.mapSize.push(7);
      procengine.mapData.mapStart = procengine.identifiedNames.namesIndex["solid"];
      procengine.mapData.mapDig = procengine.identifiedNames.namesIndex["empty"];
    }
    procengine.identifiedNames.maxCounts[procengine.mapData.mapStart] = -1;
    procengine.identifiedNames.maxCounts[procengine.mapData.mapDig] = -1;
    
    if(data.hasOwnProperty("roomData")){
      var pieces = data["roomData"][0].trim().split(":");
      procengine.roomData.roomType = procengine.RoomType[pieces[0].toLowerCase().trim()];
      procengine.roomData.roomNumber = parseInt(pieces[2].trim());
      pieces = pieces[1].toLowerCase().trim().split("x");
      procengine.roomData.roomParameter.push(parseInt(pieces[0]));
      procengine.roomData.roomParameter.push(parseInt(pieces[1]));
      pieces = data["roomData"][1].trim().split("|");
      for(var i = 0; i < pieces.length; i++){
        procengine.roomData.startingRules.push(new procengine.ReplacingRule(pieces[i].trim()));
      }
    }
    else{
      procengine.roomData.roomType = procengine.RoomType["equal"];
      procengine.roomData.roomNumber = 1;
      procengine.roomData.roomParameter = [1, 1];
      procengine.roomData.startingRules.push(new procengine.ReplacingRule("empty,1"));
    }
    procengine.fixRulesProbability(procengine.roomData.startingRules,
      procengine.getTotalProbability(procengine.roomData.startingRules));

    if(data.hasOwnProperty("generationRules")){
      for(var i = 0; i < data["generationRules"].length; i++){
        procengine.generationRules.push(new procengine.GenerationRule(data["generationRules"][i]));
      }
    }
    else{
      procengine.generationRules = [];
    }

    procengine.testing.isInitialized = true;
  },
  /**
   * generate a level based on the intialized data
   * @returns {String[][]} a 2d matrix of the defined names
   */
  generateMap: function(){
    if(!procengine.testing.isInitialized){
      console.log("you must call initialize first");
    }

    procengine.testing.currentCounts = {};
    for(var index in procengine.identifiedNames.indexNames){
      procengine.testing.currentCounts[index] = 0;
    }

    var map = procengine.getStartingMap();
    if(procengine.testing.isDebug){
      console.log("After constructing the matrix:\n");
      procengine.printDebugMap(map);
      console.log("Room Automata:\n")
    }

    var rooms = procengine.getRooms(map);
    procengine.shuffleArray(rooms);

    for(var i=0; i<rooms.length; i++){
      procengine.roomInitialize(map, rooms[i], procengine.roomData.startingRules);
      if(procengine.testing.isDebug){
        console.log("Initializing room " + i.toString() + ":\n");
        procengine.printDebugMap(map);
      }
    }

    for(var i=0; i<procengine.generationRules.length; i++){
      procengine.applyGenerationRule(map, rooms, procengine.generationRules[i]);
    }

    return procengine.getNamesMap(map);
  },
  /**
   * get string contains all the data about the generator
   * @returns {String} display all the information stored in the engine
   */
  toString: function(){
    return "mapSize: " + procengine.mapData.mapSize[0].toString() + "x" +
                         procengine.mapData.mapSize[1].toString() + " " +
      "mapStart: " + procengine.identifiedNames.indexNames[procengine.mapData.mapStart] + " " +
      "mapDig: " + procengine.identifiedNames.indexNames[procengine.mapData.mapDig] + "\n" +
      "roomNumber: " + procengine.roomData.roomNumber.toString() + " " +
      "roomType: " + procengine.roomData.roomType + " " +
      "roomParameters: " + procengine.roomData.roomParameter[0].toString() + "x" +
                        procengine.roomData.roomParameter[1].toString() + "\n" +
      "startingRules: [" + procengine.roomData.startingRules.toString() + "]\n" +
      "names: " + procengine.identifiedNames.indexNames.toString() + "\n" +
      "maxCounts: " + procengine.identifiedNames.maxCounts.toString() + "\n" +
      "generationRules:\n" +
          procengine.generationRules.toString() + "\n";
  }
};
///////////////////////////////Testing Code/////////////////////////////////////
// var data = {
//   "mapData": ["24x8", "solid:empty"],
//   "roomData": ["equal:2x2:4", "solid:1|empty:2"],
//   "names": ["empty:-1", "solid:-1", "goal:1"],
//   "neighbourhoods": {"plus":"010,101,010", "all":"111,101,111"},
//   "generationRules": [
//     {"genData": ["2", "room:-1", "connect:plus:1"], 
//       "rules": ["empty,all,or,solid>5,solid:1"]},
//     {"genData": ["1", "room:2", "connect:plus:1"],
//      "rules": ["empty,all,or,empty>4,empty:4|goal:1"]}
//     {"genData": ["0", "map:-1", "connect:plus:1"], 
//       "rules": []}
//   ]
// };
// procengine.initialize(data);
// procengine.generateMap();
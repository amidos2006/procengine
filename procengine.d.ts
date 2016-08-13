/**
 * ProcEngine v1.1.0
 * @author Ahmed Khalifa (Amidos)
 */
declare module procengine{
  /**
  * initialize the whole framework with new data
  * @param data {Object} have the following fields "mapData", "names",
  *                      "neigbourhoods", "startingRules", "roomRules",
  *                      "smoothRules"
  */
  function intialize(data:Object):void;
  /**
  * generate a level based on the intialized data
  * @return {String[][]} a 2d matrix of the defined names
  */
  function generateLevel():String[][];
  /**
  * get string contains all the data about the generator
  * @return {String} display all the information stored in the engine
  */
  function toString():String;
}
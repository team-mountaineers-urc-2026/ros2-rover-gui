# Science
## Drill Depth
**Publishers:** 
 - **/science/drill_depth/publisher**
	 - **message type:** std_msgs/msg/Int64
	 - Sends the target drill depth from the slider

**Listeners:** 
 - **/science/drill_depth/listener**
	 - **message type:** std_msgs/msg/Int64
	 - Listens for the drill depth to update the actual drill depth indicators on the slider

## Drill Speed
**Publishers:** 
 - **/science/drill_speed/publisher**
	 - **message type:** robot_interfaces/msg/ScienceGui 
		 - numVal: Int64
		 - boolVal: Boolean
	 - Sends the target drill speed from the slider, when the set button is pressed, or the direction is changed.

**Listeners:** 
 - **/science/drill_speed/listener**
	 - **message type:** std_msgs/msg/Int64
	 - Listens for the drill speed to update the actual drill speed indicators on the slider

## Soil Collector Depth
**Publishers:** 
 - **/science/actuator_pos**
	 - **message type:** robot_interfaces/msg/STargetedFloat
		 - target: String
		 - data: Float32
	 - Sends the target soil collector depth from the slider

**Listeners:** 
 - **/science/actuator_pos/listener**
	 - **message type:** std_msgs/msg/Int64
	 - Listens for the target soil collector depth to update the actual soil collector depth indicators on the slider
 - **/science/soil_collector_on**
	 - **message type:** std_msgs/msg/Bool
	 - Listens for when to set the visual indicator for when the soil collector is on or off

## Soil Collector Speed
**Publishers:** 
 - **/front_back_scoop/collector_speed**
	 - **message type:** robot_interfaces/msg/TargetedFloat
		 - target: String
		 - data: Float32
	 - Sends the target soil collector speed from the slider

**Listeners:** 
 - **/front_back_scoop/collector_speed/listener**
	 - **message type:** std_msgs/msg/Int64
	 - Listens for the soil collector speed to update the actual soil collector speed indicators on the slider

## Soil Collector Pumps
**Publishers:** 
 - **/science/soil_collector/pump_to'**
	 - **message type:** robot_interfaces/msg/ScienceGui 
		 - numVal: Int64
		 - boolVal: Boolean (false = Collector 1, true = Collector 2)
	 - Sends the amount to pump to the selected collector
 - **/science/soil_collector/pump_from'**
	 - **message type:** robot_interfaces/msg/ScienceGui 
		 - numVal: Int64
		 - boolVal: Boolean (false = Collector 1, true = Collector 2)
	 - Sends the amount to pump from the selected collector

## Cuvette
**Publishers:** 
 - **/science/cuvette/baeyer'**
	 - **message type:** std_msgs/msg/Int64
	 - Sends the amount of Baeyer's Reagant to pump to the cuvette
 - **/science/cuvette/hcl'**
	 - **message type:** std_msgs/msg/Int64
	 - Sends the amount of HCl to pump to the cuvette
 - **/science/cuvette/rotation'**
	 - **message type:** robot_interfaces/msg/ScienceGui 
		 - numVal: Int64
		 - boolVal: Boolean (false = Forward, true = Backward)

## Lightbulb
**Publishers:** 
 - **/science/lightbulb_on/publisher'**
	 - **message type:** std_msgs/msg/Bool
	 - Sends whether to turn the lightbulb on or off
	 
**Listeners:** 
 - **/science/lightbulb_on/listener'**
	 - **message type:** std_msgs/msg/Bool
	 - Listens for whether to turn the lightbulb visual indicator on or off


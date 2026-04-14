// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DecisionLineageLogger} from "../src/DecisionLineageLogger.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        DecisionLineageLogger logger = new DecisionLineageLogger();
        console2.log("DecisionLineageLogger deployed at:", address(logger));

        vm.stopBroadcast();
    }
}

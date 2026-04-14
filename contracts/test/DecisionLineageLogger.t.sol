// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DecisionLineageLogger} from "../src/DecisionLineageLogger.sol";

contract DecisionLineageLoggerTest is Test {
    DecisionLineageLogger public logger;
    address public agent = address(0xA1);

    function setUp() public {
        logger = new DecisionLineageLogger();
    }

    function test_registerAgent() public {
        vm.prank(agent);
        logger.registerAgent("Test Agent v1");
        assertTrue(logger.isRegistered(agent));
    }

    function test_registerAgent_revert_alreadyRegistered() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent v1");
        vm.expectRevert(DecisionLineageLogger.AlreadyRegistered.selector);
        logger.registerAgent("Test Agent v2");
        vm.stopPrank();
    }

    function test_logDecision() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");

        bytes32 decisionId = keccak256("decision-1");
        bytes32 reasoningHash = keccak256("reasoning text");
        logger.logDecision(
            decisionId,
            reasoningHash,
            "ipfs://QmTest123",
            0, // SIGNAL_COLLECTED
            bytes32(uint256(0x1234))
        );

        DecisionLineageLogger.Decision memory d = logger.getDecision(decisionId);
        assertEq(d.agent, agent);
        assertEq(d.decisionId, decisionId);
        assertEq(d.prevDecisionId, bytes32(0));
        assertEq(d.reasoningHash, reasoningHash);
        assertEq(d.actionType, 0);
        assertEq(logger.getAgentDecisionCount(agent), 1);
        vm.stopPrank();
    }

    function test_logDecision_chain() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");

        bytes32 id1 = keccak256("d1");
        bytes32 id2 = keccak256("d2");
        bytes32 id3 = keccak256("d3");

        logger.logDecision(id1, keccak256("r1"), "ipfs://1", 0, bytes32(0));
        logger.logDecision(id2, keccak256("r2"), "ipfs://2", 1, bytes32(0));
        logger.logDecision(id3, keccak256("r3"), "ipfs://3", 3, bytes32(uint256(0xABCD)));

        DecisionLineageLogger.Decision memory d1 = logger.getDecision(id1);
        DecisionLineageLogger.Decision memory d2 = logger.getDecision(id2);
        DecisionLineageLogger.Decision memory d3 = logger.getDecision(id3);

        assertEq(d1.prevDecisionId, bytes32(0));
        assertEq(d2.prevDecisionId, id1);
        assertEq(d3.prevDecisionId, id2);

        DecisionLineageLogger.Decision[] memory chain = logger.getAgentDecisionChain(agent, 0, 10);
        assertEq(chain.length, 3);
        assertEq(chain[0].decisionId, id1);
        assertEq(chain[2].decisionId, id3);

        DecisionLineageLogger.Decision[] memory subset = logger.getAgentDecisionChain(agent, 1, 1);
        assertEq(subset.length, 1);
        assertEq(subset[0].decisionId, id2);

        vm.stopPrank();
    }

    function test_logDecision_revert_notRegistered() public {
        vm.prank(agent);
        vm.expectRevert(DecisionLineageLogger.NotRegistered.selector);
        logger.logDecision(keccak256("d1"), keccak256("r1"), "ipfs://1", 0, bytes32(0));
    }

    function test_logDecision_revert_duplicateId() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        bytes32 id = keccak256("d1");
        logger.logDecision(id, keccak256("r1"), "ipfs://1", 0, bytes32(0));
        vm.expectRevert(DecisionLineageLogger.DecisionAlreadyExists.selector);
        logger.logDecision(id, keccak256("r2"), "ipfs://2", 1, bytes32(0));
        vm.stopPrank();
    }

    function test_logDecision_revert_invalidId() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        vm.expectRevert(DecisionLineageLogger.InvalidDecisionId.selector);
        logger.logDecision(bytes32(0), keccak256("r1"), "ipfs://1", 0, bytes32(0));
        vm.stopPrank();
    }

    function test_totalDecisions() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        logger.logDecision(keccak256("d1"), keccak256("r1"), "ipfs://1", 0, bytes32(0));
        logger.logDecision(keccak256("d2"), keccak256("r2"), "ipfs://2", 1, bytes32(0));
        assertEq(logger.totalDecisions(), 2);
        vm.stopPrank();
    }
}

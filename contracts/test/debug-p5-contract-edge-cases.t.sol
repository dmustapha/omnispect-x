// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DecisionLineageLogger} from "../src/DecisionLineageLogger.sol";

contract DebugP5ContractEdgeCases is Test {
    DecisionLineageLogger public logger;
    address public agent1 = address(0xA1);
    address public agent2 = address(0xB2);

    function setUp() public {
        logger = new DecisionLineageLogger();
    }

    // ─── Zero Values ─────────────────────────────────────────────────────

    function test_registerAgent_emptyMetadata() public {
        vm.prank(agent1);
        logger.registerAgent("");
        assertTrue(logger.isRegistered(agent1));
        // Empty metadata is allowed — no revert
    }

    function test_logDecision_zeroReasoningHash() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        // bytes32(0) for reasoningHash should be allowed (only decisionId is validated)
        logger.logDecision(keccak256("d1"), bytes32(0), "", 0, bytes32(0));
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("d1"));
        assertEq(d.reasoningHash, bytes32(0));
        vm.stopPrank();
    }

    function test_logDecision_emptyReasoningURI() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        logger.logDecision(keccak256("d1"), keccak256("r"), "", 0, bytes32(0));
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("d1"));
        assertEq(bytes(d.reasoningURI).length, 0);
        vm.stopPrank();
    }

    function test_logDecision_zeroResultTxHash() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        logger.logDecision(keccak256("d1"), keccak256("r"), "ipfs://x", 0, bytes32(0));
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("d1"));
        assertEq(d.resultTxHash, bytes32(0));
        vm.stopPrank();
    }

    // ─── Max Values ──────────────────────────────────────────────────────

    function test_logDecision_maxActionType() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        // uint8 max = 255
        logger.logDecision(keccak256("d1"), keccak256("r"), "ipfs://x", 255, bytes32(0));
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("d1"));
        assertEq(d.actionType, 255);
        vm.stopPrank();
    }

    function test_logDecision_longReasoningURI() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        // Very long URI string
        string memory longURI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/This_is_a_very_long_CID_that_should_still_work_as_a_valid_reasoning_URI_for_testing";
        logger.logDecision(keccak256("d1"), keccak256("r"), longURI, 0, bytes32(0));
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("d1"));
        assertEq(keccak256(bytes(d.reasoningURI)), keccak256(bytes(longURI)));
        vm.stopPrank();
    }

    // ─── Boundary Values ─────────────────────────────────────────────────

    function test_getAgentDecisionChain_offsetBeyondLength() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        logger.logDecision(keccak256("d1"), keccak256("r"), "", 0, bytes32(0));
        vm.stopPrank();

        // Offset beyond chain length returns empty
        DecisionLineageLogger.Decision[] memory result = logger.getAgentDecisionChain(agent1, 999, 10);
        assertEq(result.length, 0);
    }

    function test_getAgentDecisionChain_zeroLimit() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        logger.logDecision(keccak256("d1"), keccak256("r"), "", 0, bytes32(0));
        vm.stopPrank();

        DecisionLineageLogger.Decision[] memory result = logger.getAgentDecisionChain(agent1, 0, 0);
        assertEq(result.length, 0);
    }

    function test_getAgentDecisionChain_limitLargerThanChain() public {
        vm.startPrank(agent1);
        logger.registerAgent("agent");
        logger.logDecision(keccak256("d1"), keccak256("r"), "", 0, bytes32(0));
        logger.logDecision(keccak256("d2"), keccak256("r"), "", 0, bytes32(0));
        vm.stopPrank();

        // Limit 100 but only 2 decisions
        DecisionLineageLogger.Decision[] memory result = logger.getAgentDecisionChain(agent1, 0, 100);
        assertEq(result.length, 2);
    }

    // ─── Unauthorized Callers ────────────────────────────────────────────

    function test_logDecision_unregisteredAgent() public {
        // agent2 never registered
        vm.prank(agent2);
        vm.expectRevert(DecisionLineageLogger.NotRegistered.selector);
        logger.logDecision(keccak256("d1"), keccak256("r"), "", 0, bytes32(0));
    }

    // ─── Multi-Agent Isolation ───────────────────────────────────────────

    function test_twoAgents_separateChains() public {
        vm.prank(agent1);
        logger.registerAgent("Agent 1");
        vm.prank(agent2);
        logger.registerAgent("Agent 2");

        vm.prank(agent1);
        logger.logDecision(keccak256("a1-d1"), keccak256("r"), "", 0, bytes32(0));
        vm.prank(agent2);
        logger.logDecision(keccak256("a2-d1"), keccak256("r"), "", 0, bytes32(0));

        // Each agent has own chain
        assertEq(logger.getAgentDecisionCount(agent1), 1);
        assertEq(logger.getAgentDecisionCount(agent2), 1);

        // Chains don't cross
        DecisionLineageLogger.Decision[] memory chain1 = logger.getAgentDecisionChain(agent1, 0, 10);
        DecisionLineageLogger.Decision[] memory chain2 = logger.getAgentDecisionChain(agent2, 0, 10);
        assertEq(chain1[0].agent, agent1);
        assertEq(chain2[0].agent, agent2);
        // prevDecisionId should be 0x0 for first decision of each agent
        assertEq(chain1[0].prevDecisionId, bytes32(0));
        assertEq(chain2[0].prevDecisionId, bytes32(0));
    }

    // ─── View Functions on Non-Existent Data ─────────────────────────────

    function test_getDecision_nonExistent() public view {
        DecisionLineageLogger.Decision memory d = logger.getDecision(keccak256("nonexistent"));
        assertEq(d.agent, address(0));
        assertEq(d.timestamp, 0);
    }

    function test_getAgentDecisionCount_unregisteredAgent() public view {
        assertEq(logger.getAgentDecisionCount(address(0xDEAD)), 0);
    }

    function test_isRegistered_unregisteredAddress() public view {
        assertFalse(logger.isRegistered(address(0xDEAD)));
    }

    function test_getAgentDecisionChain_unregisteredAgent() public view {
        DecisionLineageLogger.Decision[] memory result = logger.getAgentDecisionChain(address(0xDEAD), 0, 10);
        assertEq(result.length, 0);
    }

    // ─── Address(0) Edge Case ────────────────────────────────────────────

    function test_registerAgent_fromAddressZero() public {
        // address(0) can register (no access control on registration)
        vm.prank(address(0));
        logger.registerAgent("Zero Agent");
        assertTrue(logger.isRegistered(address(0)));
    }

    // ─── totalDecisions Counter ──────────────────────────────────────────

    function test_totalDecisions_multiAgent() public {
        vm.prank(agent1);
        logger.registerAgent("Agent 1");
        vm.prank(agent2);
        logger.registerAgent("Agent 2");

        vm.prank(agent1);
        logger.logDecision(keccak256("a1-d1"), keccak256("r"), "", 0, bytes32(0));
        vm.prank(agent2);
        logger.logDecision(keccak256("a2-d1"), keccak256("r"), "", 0, bytes32(0));
        vm.prank(agent1);
        logger.logDecision(keccak256("a1-d2"), keccak256("r"), "", 1, bytes32(0));

        // Global counter tracks all agents
        assertEq(logger.totalDecisions(), 3);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DecisionLineageLogger {
    // ─── Types ──────────────────────────────────────────────────────────────

    struct Decision {
        address agent;
        bytes32 decisionId;
        bytes32 prevDecisionId;
        bytes32 reasoningHash;
        string reasoningURI;
        uint8 actionType;
        bytes32 resultTxHash;
        uint64 timestamp;
        uint64 blockNumber;
    }

    // ─── Storage ────────────────────────────────────────────────────────────

    mapping(bytes32 => Decision) public decisions;
    mapping(address => bytes32[]) public agentDecisionIds;
    mapping(address => bool) public registeredAgents;
    mapping(address => string) public agentMetadata;

    uint256 public totalDecisions;

    // ─── Events ─────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string metadata);

    event DecisionLogged(
        address indexed agent,
        bytes32 indexed decisionId,
        bytes32 indexed prevDecisionId,
        uint8 actionType,
        bytes32 resultTxHash,
        string reasoningURI,
        uint64 timestamp
    );

    // ─── Errors ─────────────────────────────────────────────────────────────

    error NotRegistered();
    error DecisionAlreadyExists();
    error AlreadyRegistered();
    error InvalidDecisionId();

    // ─── Agent Registration ─────────────────────────────────────────────────

    function registerAgent(string calldata metadata) external {
        if (registeredAgents[msg.sender]) revert AlreadyRegistered();
        registeredAgents[msg.sender] = true;
        agentMetadata[msg.sender] = metadata;
        emit AgentRegistered(msg.sender, metadata);
    }

    // ─── Decision Logging ───────────────────────────────────────────────────

    function logDecision(
        bytes32 decisionId,
        bytes32 reasoningHash,
        string calldata reasoningURI,
        uint8 actionType,
        bytes32 resultTxHash
    ) external {
        if (!registeredAgents[msg.sender]) revert NotRegistered();
        if (decisionId == bytes32(0)) revert InvalidDecisionId();
        if (decisions[decisionId].agent != address(0)) revert DecisionAlreadyExists();

        // Get prev decision id (last in agent's chain, or 0x0 if first)
        bytes32[] storage chain = agentDecisionIds[msg.sender];
        bytes32 prevId = chain.length > 0 ? chain[chain.length - 1] : bytes32(0);

        Decision storage d = decisions[decisionId];
        d.agent = msg.sender;
        d.decisionId = decisionId;
        d.prevDecisionId = prevId;
        d.reasoningHash = reasoningHash;
        d.reasoningURI = reasoningURI;
        d.actionType = actionType;
        d.resultTxHash = resultTxHash;
        d.timestamp = uint64(block.timestamp);
        d.blockNumber = uint64(block.number);

        chain.push(decisionId);
        totalDecisions++;

        emit DecisionLogged(
            msg.sender,
            decisionId,
            prevId,
            actionType,
            resultTxHash,
            reasoningURI,
            uint64(block.timestamp)
        );
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    function getDecision(bytes32 decisionId) external view returns (Decision memory) {
        return decisions[decisionId];
    }

    function getAgentDecisionChain(
        address agent,
        uint256 offset,
        uint256 limit
    ) external view returns (Decision[] memory) {
        bytes32[] storage ids = agentDecisionIds[agent];
        uint256 total = ids.length;
        if (offset >= total) return new Decision[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        Decision[] memory result = new Decision[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = decisions[ids[offset + i]];
        }
        return result;
    }

    function getAgentDecisionCount(address agent) external view returns (uint256) {
        return agentDecisionIds[agent].length;
    }

    function isRegistered(address agent) external view returns (bool) {
        return registeredAgents[agent];
    }
}

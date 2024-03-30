// SPDX-License-Identifier: MIT
   
pragma solidity ^0.8.20; 

contract DAOMembership {

    mapping(address => uint256) public companyReputationScores; 

    enum VerificationAction {
        FastVerification,
        HighVolume,
        Accurate 
    }

    event ReputationAwarded(address indexed company, VerificationAction action, uint256 amount);
    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer);
    event VoteRecorded(uint256 indexed proposalId, address indexed voter, bool approve);

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
        uint256 votesFor;
        uint256 votesAgainst;     
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId;

    function awardCompanyReputation(address company, VerificationAction action) public {
        uint256 amount = 10; 
        if (action == VerificationAction.FastVerification) {
            amount += 5; 
        }
        companyReputationScores[company] += amount;
        emit ReputationAwarded(company, action, amount);
    }

    function submitProposal(string memory title, string memory description) public {
    uint256 currentProposalId = nextProposalId; 
    nextProposalId++;

    Proposal storage newProposal = proposals[currentProposalId];

    newProposal.id = currentProposalId;
    newProposal.title = title;
    newProposal.description = description;
    newProposal.deadline = block.timestamp + 7 days; 
    newProposal.executed = false;
    newProposal.votesFor = 0;
    newProposal.votesAgainst = 0;

    emit ProposalSubmitted(currentProposalId, msg.sender);
    }



   function voteOnProposal(uint256 proposalId, bool approve) public {
    Proposal storage proposal = proposals[proposalId]; 

    require(proposal.deadline > block.timestamp, "Voting period has ended");
    require(!proposal.hasVoted[msg.sender], "Already voted");


    proposal.hasVoted[msg.sender] = true; 
    if (approve) {
        proposal.votesFor++;
    } else {
        proposal.votesAgainst++;
    }

    emit VoteRecorded(proposalId, msg.sender, approve);
} 

}


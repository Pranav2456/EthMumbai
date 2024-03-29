// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; 


import "./utils/AccessLock.sol"; 
import "./DAO.sol";

pragma solidity ^0.8.20; 

import "./utils/AccessLock.sol"; 

contract VerificationTicket is AccessLock {

    struct Ticket { 
        bytes32 dataHash; 
        address issuer; 
        Status status; 
        uint256 timestamp; 
    }

    enum Status { Pending, Approved, Rejected }

    mapping(uint256 => Ticket) public tickets; 
    uint256 public ticketId; 

    event TicketCreated(uint256 indexed ticketId, address indexed issuer);
    event TicketApproved(uint256 indexed ticketId);
    event TicketRejected(uint256 indexed ticketId, string reason);

    function createTicket(bytes32 _dataHash, address _issuer) public  {
        ticketId++; 
        tickets[ticketId] = Ticket({
            dataHash: _dataHash,
            issuer: _issuer,
            status: Status.Pending,
            timestamp: block.timestamp 
        });

        emit TicketCreated(ticketId, _issuer);
    }

    function approveTicket(uint256 _ticketId) public onlyAdmin {
        require(tickets[_ticketId].status == Status.Pending, "Ticket not pending");
        tickets[_ticketId].status = Status.Approved;
        emit TicketApproved(_ticketId);
    }

    function rejectTicket(uint256 _ticketId, string calldata _reason) public onlyAdmin {
        require(tickets[_ticketId].status == Status.Pending, "Ticket not pending");
        tickets[_ticketId].status = Status.Rejected;
        emit TicketRejected(_ticketId, _reason);
    }
}
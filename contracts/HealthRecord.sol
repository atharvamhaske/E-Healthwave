// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HealthRecord is Ownable, ReentrancyGuard {
    struct Record {
        bytes32 dataHash;
        address[] authorizedProviders;
        uint256 lastUpdated;
        bool emergencyAccessEnabled;
        string emergencyPin;
    }
    
    mapping(address => Record) private patientRecords;
    mapping(address => bool) public verifiedProviders;
    
    event RecordUpdated(address indexed patient, bytes32 dataHash);
    event ProviderAuthorized(address indexed patient, address indexed provider);
    event EmergencyAccessGranted(address indexed patient, address indexed provider);
    
    modifier onlyVerifiedProvider() {
        require(verifiedProviders[msg.sender], "Not a verified provider");
        _;
    }
    
    function addProvider(address provider) external onlyOwner {
        verifiedProviders[provider] = true;
    }
    
    function updateRecord(bytes32 _dataHash) external {
        Record storage record = patientRecords[msg.sender];
        record.dataHash = _dataHash;
        record.lastUpdated = block.timestamp;
        emit RecordUpdated(msg.sender, _dataHash);
    }
    
    function authorizeProvider(address provider) external {
        require(verifiedProviders[provider], "Provider not verified");
        Record storage record = patientRecords[msg.sender];
        record.authorizedProviders.push(provider);
        emit ProviderAuthorized(msg.sender, provider);
    }
    
    function setEmergencyAccess(bool enabled, string calldata pin) external {
        Record storage record = patientRecords[msg.sender];
        record.emergencyAccessEnabled = enabled;
        if (enabled) {
            record.emergencyPin = pin;
        }
    }
    
    function getRecord(address patient, string calldata emergencyPin) 
        external 
        view 
        returns (bytes32 dataHash, uint256 lastUpdated) 
    {
        Record storage record = patientRecords[patient];
        require(
            msg.sender == patient ||
            isAuthorizedProvider(patient, msg.sender) ||
            (record.emergencyAccessEnabled && keccak256(abi.encodePacked(emergencyPin)) == keccak256(abi.encodePacked(record.emergencyPin))),
            "Unauthorized access"
        );
        return (record.dataHash, record.lastUpdated);
    }
    
    function isAuthorizedProvider(address patient, address provider) 
        public 
        view 
        returns (bool) 
    {
        Record storage record = patientRecords[patient];
        for (uint i = 0; i < record.authorizedProviders.length; i++) {
            if (record.authorizedProviders[i] == provider) {
                return true;
            }
        }
        return false;
    }
}

# ADR-001: License Selection for Commercial Protection

**Status**: Accepted
**Date**: 2025-10-03
**Authors**: Jesus Platform Team
**Relates to**: Issue #4

## Context

The Jesus platform is an enterprise-grade AI orchestration system with significant development investment. We need a license that:
1. Protects commercial interests while allowing community contributions
2. Prevents cloud providers from offering Jesus as a hosted service without contribution
3. Allows internal organizational use without restrictions
4. Maintains compatibility with our dependency ecosystem
5. Provides clear migration path to fully open source in the future

Key considerations:
- **Competition Risk**: Large cloud providers could take the code and offer managed services
- **Community Growth**: We want external contributors and users
- **Enterprise Sales**: Some customers require specific license types
- **Dependency Compatibility**: Most dependencies are MIT/Apache-2.0
- **Long-term Vision**: Eventually transition to permissive license after market establishment

## Decision

We will adopt the **Business Source License 1.1 (BUSL-1.1)** with the following parameters:

**License**: Business Source License 1.1
**Licensor**: [Organization Name]
**Licensed Work**: Jesus AI Agent Orchestration Platform
**Additional Use Grant**:
- Production use by organizations with fewer than 1,000 employees
- Non-production use (development, testing, research) without restrictions
- Evaluation and proof-of-concept deployments

**Change Date**: 4 years from each version release
**Change License**: Apache License 2.0

This means:
- **Immediate**: Open source code, community contributions, free use for small/medium organizations
- **Large Enterprises**: Require commercial license for production use
- **After 4 years**: Each version automatically converts to Apache 2.0

## Consequences

### Positive

1. **Commercial Protection**: Prevents hyperscalers from offering managed Jesus without partnership
2. **Community Friendly**: Allows use, modification, and contribution for most users
3. **Predictable Openness**: Automatic conversion to Apache 2.0 ensures eventual full open source
4. **Flexible Monetization**: Enables commercial licensing for large enterprises
5. **Clear Terms**: BUSL-1.1 is well-understood and legally tested
6. **Compatible**: Works with MIT/Apache dependencies (no copyleft contamination)

### Negative

1. **Not OSI-Approved**: BUSL-1.1 is not considered "open source" by OSI definition
2. **Enterprise Friction**: Some large companies avoid non-standard licenses
3. **Contribution Concerns**: Some developers prefer contributing to fully open projects
4. **License Compliance**: Organizations need to track employee count for compliance
5. **Marketplace Restrictions**: May not qualify for some cloud marketplace programs

### Neutral

1. **CLA Requirement**: We will require a Contributor License Agreement (CLA) to maintain licensing flexibility
2. **Documentation Burden**: Need clear LICENSE, CONTRIBUTING.md, and commercial terms
3. **Legal Review**: Customers may require additional legal review before adoption

## Alternatives Considered

### Alternative 1: MIT License (Fully Permissive)
- **Pros**: Maximum adoption, no restrictions, OSI-approved
- **Cons**: No commercial protection, anyone can offer managed service
- **Rejected**: Too risky for commercial viability

### Alternative 2: AGPL-3.0 (Strong Copyleft)
- **Pros**: Requires service providers to share modifications
- **Cons**: Viral license, incompatible with proprietary integrations, enterprise-hostile
- **Rejected**: Too restrictive for target enterprise market

### Alternative 3: Server Side Public License (SSPL)
- **Pros**: Prevents cloud providers from offering as-a-service without open sourcing infrastructure
- **Cons**: Not OSI-approved, controversial (MongoDB/Elastic conflicts), unclear legal implications
- **Rejected**: Legal uncertainty and community backlash

### Alternative 4: Elastic License 2.0
- **Pros**: Prevents competitive SaaS, clear terms
- **Cons**: No automatic conversion to permissive license, less community-friendly than BUSL
- **Rejected**: BUSL provides better long-term openness

### Alternative 5: Dual License (GPL + Commercial)
- **Pros**: OSI-approved GPL option, clear commercial path
- **Cons**: GPL viral effects limit adoption, complex compliance
- **Rejected**: Too complex for our use case

## Implementation Notes

1. **LICENSE File**: Add BUSL-1.1 license text with specific parameters
2. **NOTICE File**: List all dependencies and their licenses
3. **CONTRIBUTING.md**: Document CLA requirement and contribution process
4. **SECURITY.md**: Vulnerability disclosure and security policies
5. **CODE_OF_CONDUCT.md**: Community standards (Contributor Covenant)
6. **Commercial Terms**: Separate document for enterprise licensing terms

## Review Date

This decision should be reviewed:
- After 1 year of operation (2026-10-03)
- If community feedback indicates significant adoption barriers
- If legal landscape changes (e.g., new license options emerge)

## References

- [BUSL-1.1 License Text](https://mariadb.com/bsl11/)
- [HashiCorp's BUSL Adoption](https://www.hashicorp.com/blog/hashicorp-adopts-business-source-license)
- [Sentry's License Journey](https://blog.sentry.io/2019/11/06/relicensing-sentry/)

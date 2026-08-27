# Security

## Data handling

The plugin reads public skill metadata from the Skill Base URL configured in
the browser. It does not read local agent directories, upload files, persist
Skill Base credentials, or install skills.

Remote Skill Base URLs must use HTTPS. HTTP is accepted only for loopback
development addresses. URLs containing credentials, query parameters, or
fragments are rejected.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do
not include credentials, private server addresses, or production data in a
public issue.

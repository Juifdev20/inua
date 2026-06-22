UPDATE users 
SET token_version = 0,
    must_change_password = false
WHERE username = 'superadmin';

SELECT username, token_version, must_change_password 
FROM users WHERE username = 'superadmin';

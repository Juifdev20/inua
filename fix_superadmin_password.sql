UPDATE users 
SET password = '$2b$10$/xpQkiRSjmxftgxQtZqI5edKgRtQhA/jD9INmkJWHEX/hz17RVQle',
    must_change_password = false
WHERE username = 'superadmin';

SELECT username, LEFT(password, 10) as hash_preview FROM users WHERE username = 'superadmin';

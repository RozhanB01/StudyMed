const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const JWT_SECRET =
    process.env.JWT_SECRET || "StudyMed_Secret_2026";

function registerUser({
    fullName,
    username,
    email,
    password,
    field,
    semester,
    dailyGoalHours
}) {

    if (
        !fullName ||
        !username ||
        !email ||
        !password
    ) {
        throw new Error(
            "لطفاً اطلاعات ضروری را کامل وارد کنید."
        );
    }

    const existingUser = db.prepare(`
        SELECT id
        FROM users
        WHERE email = ? OR username = ?
    `).get(email, username);

    if (existingUser) {
        throw new Error(
            "این ایمیل یا نام کاربری قبلاً ثبت شده است."
        );
    }

    const passwordHash =
        bcrypt.hashSync(password, 12);

    const dailyGoalMinutes =
        Math.round(
            Number(dailyGoalHours || 8) * 60
        );

    const result = db.prepare(`
        INSERT INTO users
        (
            full_name,
            username,
            email,
            password_hash,
            field,
            semester,
            daily_goal_minutes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        fullName,
        username,
        email,
        passwordHash,
        field || "",
        semester || "",
        dailyGoalMinutes
    );

    const user = db.prepare(`
        SELECT
            id,
            full_name,
            username,
            email,
            field,
            semester,
            daily_goal_minutes,
            created_at
        FROM users
        WHERE id = ?
    `).get(result.lastInsertRowid);

    const token = jwt.sign(
        {
            userId: user.id
        },
        JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );

    return {
        user,
        token
    };
}


function loginUser({
    email,
    password
}) {

    const user = db.prepare(`
        SELECT *
        FROM users
        WHERE email = ?
    `).get(email);

    if (!user) {
        throw new Error(
            "ایمیل یا رمز عبور اشتباه است."
        );
    }

    const validPassword =
        bcrypt.compareSync(
            password,
            user.password_hash
        );

    if (!validPassword) {
        throw new Error(
            "ایمیل یا رمز عبور اشتباه است."
        );
    }

    const safeUser = {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        field: user.field,
        semester: user.semester,
        daily_goal_minutes:
            user.daily_goal_minutes,
        created_at:
            user.created_at
    };

    const token = jwt.sign(
        {
            userId: user.id
        },
        JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );

    return {
        user: safeUser,
        token
    };
}


function verifyToken(token) {

    return jwt.verify(
        token,
        JWT_SECRET
    );

}


module.exports = {
    registerUser,
    loginUser,
    verifyToken
};
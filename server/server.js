
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./database");

const {
    registerUser,
    loginUser,
    verifyToken
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 4000;


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());
app.use(express.json());


/* =====================================================
   DATABASE MIGRATION
===================================================== */

try {

    const taskColumns = db
        .prepare(`PRAGMA table_info(tasks)`)
        .all()
        .map(column => column.name);

    if (!taskColumns.includes("subject")) {

        db.prepare(`
            ALTER TABLE tasks
            ADD COLUMN subject TEXT
        `).run();

        console.log(
            "Database migration: subject column added."
        );
    }

} catch (error) {

    console.error(
        "Database migration error:",
        error
    );

}


/* =====================================================
   HELPERS
===================================================== */

function today() {

    return new Date()
        .toISOString()
        .slice(0, 10);

}


/* =====================================================
   AUTHENTICATION
===================================================== */

function authenticate(req, res, next) {

    const header =
        req.headers.authorization;

    if (
        !header ||
        !header.startsWith("Bearer ")
    ) {

        return res.status(401).json({
            success: false,
            error: "دسترسی غیرمجاز است."
        });

    }

    const token =
        header.split(" ")[1];

    try {

        const decoded =
            verifyToken(token);

        req.userId =
            decoded.userId;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error:
                "توکن نامعتبر یا منقضی شده است."
        });

    }

}


/* =====================================================
   HEALTH
===================================================== */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            message:
                "StudyMed Server is running 🚀"
        });

    }
);


/* =====================================================
   AUTH - REGISTER
===================================================== */

app.post(
    "/api/auth/register",
    (req, res) => {

        try {

            const result =
                registerUser(req.body);

            res.status(201).json({
                success: true,
                ...result
            });

        } catch (error) {

            res.status(400).json({
                success: false,
                error: error.message
            });

        }

    }
);


/* =====================================================
   AUTH - LOGIN
===================================================== */

app.post(
    "/api/auth/login",
    (req, res) => {

        try {

            const result =
                loginUser(req.body);

            res.json({
                success: true,
                ...result
            });

        } catch (error) {

            res.status(401).json({
                success: false,
                error: error.message
            });

        }

    }
);


/* =====================================================
   CURRENT USER
===================================================== */

app.get(
    "/api/me",
    authenticate,
    (req, res) => {

        const user =
            db.prepare(`
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
            `).get(req.userId);

        if (!user) {

            return res.status(404).json({
                success: false,
                error: "کاربر پیدا نشد."
            });

        }

        res.json(user);

    }
);


/* =====================================================
   PLANNER - TASKS
===================================================== */


/* GET TASKS */

app.get(
    "/api/planner/tasks",
    authenticate,
    (req, res) => {

        try {

            const taskDate =
                req.query.date || today();

            const tasks =
                db.prepare(`
                    SELECT
                        id,
                        title,
                        subject,
                        category,
                        task_date,
                        start_time,
                        end_time,
                        completed,
                        created_at
                    FROM tasks
                    WHERE user_id = ?
                    AND task_date = ?
                    ORDER BY start_time ASC
                `).all(
                    req.userId,
                    taskDate
                );

            res.json({
                success: true,
                date: taskDate,
                tasks
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "دریافت برنامه‌ها ناموفق بود."
            });

        }

    }
);


/* CREATE TASK */

app.post(
    "/api/planner/tasks",
    authenticate,
    (req, res) => {

        try {

            const {
                title,
                subject,
                category,
                task_date,
                start_time,
                end_time
            } = req.body;

            if (
                !title ||
                !task_date ||
                !start_time ||
                !end_time
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "عنوان، تاریخ، زمان شروع و پایان الزامی است."
                });

            }

            if (end_time <= start_time) {

                return res.status(400).json({
                    success: false,
                    error:
                        "زمان پایان باید بعد از زمان شروع باشد."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO tasks (
                        user_id,
                        title,
                        subject,
                        category,
                        task_date,
                        start_time,
                        end_time
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    req.userId,
                    title,
                    subject || "",
                    category || "درس اصلی",
                    task_date,
                    start_time,
                    end_time
                );

            const task =
                db.prepare(`
                    SELECT *
                    FROM tasks
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    result.lastInsertRowid,
                    req.userId
                );

            res.status(201).json({
                success: true,
                task
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ذخیره برنامه با خطا مواجه شد."
            });

        }

    }
);


/* UPDATE TASK */

app.put(
    "/api/planner/tasks/:id",
    authenticate,
    (req, res) => {

        try {

            const taskId =
                Number(req.params.id);

            const existing =
                db.prepare(`
                    SELECT *
                    FROM tasks
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    taskId,
                    req.userId
                );

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    error: "برنامه پیدا نشد."
                });

            }

            const {
                title,
                subject,
                category,
                task_date,
                start_time,
                end_time,
                completed
            } = req.body;

            db.prepare(`
                UPDATE tasks
                SET
                    title = COALESCE(?, title),
                    subject = COALESCE(?, subject),
                    category = COALESCE(?, category),
                    task_date = COALESCE(?, task_date),
                    start_time = COALESCE(?, start_time),
                    end_time = COALESCE(?, end_time),
                    completed = COALESCE(?, completed)
                WHERE id = ?
                AND user_id = ?
            `).run(
                title ?? null,
                subject ?? null,
                category ?? null,
                task_date ?? null,
                start_time ?? null,
                end_time ?? null,
                completed === undefined
                    ? null
                    : completed ? 1 : 0,
                taskId,
                req.userId
            );

            const task =
                db.prepare(`
                    SELECT *
                    FROM tasks
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    taskId,
                    req.userId
                );

            res.json({
                success: true,
                task
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ویرایش برنامه ناموفق بود."
            });

        }

    }
);


/* DELETE TASK */

app.delete(
    "/api/planner/tasks/:id",
    authenticate,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    DELETE FROM tasks
                    WHERE id = ?
                    AND user_id = ?
                `).run(
                    Number(req.params.id),
                    req.userId
                );

            if (result.changes === 0) {

                return res.status(404).json({
                    success: false,
                    error:
                        "برنامه پیدا نشد."
                });

            }

            res.json({
                success: true
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "حذف برنامه ناموفق بود."
            });

        }

    }
);


/* =====================================================
   PLANNER - TODOS
===================================================== */


/* GET TODOS */

app.get(
    "/api/planner/todos",
    authenticate,
    (req, res) => {

        try {

            const todoDate =
                req.query.date || today();

            const todos =
                db.prepare(`
                    SELECT
                        id,
                        user_id,
                        todo_date,
                        text,
                        completed,
                        created_at
                    FROM todos
                    WHERE user_id = ?
                    AND todo_date = ?
                    ORDER BY id ASC
                `).all(
                    req.userId,
                    todoDate
                );

            res.json({
                success: true,
                date: todoDate,
                todos
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "دریافت کارها ناموفق بود."
            });

        }

    }
);


/* CREATE TODO */

app.post(
    "/api/planner/todos",
    authenticate,
    (req, res) => {

        try {

            const {
                text,
                todo_date
            } = req.body;

            if (!text) {

                return res.status(400).json({
                    success: false,
                    error:
                        "متن کار الزامی است."
                });

            }

            const date =
                todo_date || today();

            const result =
                db.prepare(`
                    INSERT INTO todos (
                        user_id,
                        todo_date,
                        text
                    )
                    VALUES (?, ?, ?)
                `).run(
                    req.userId,
                    date,
                    text
                );

            const todo =
                db.prepare(`
                    SELECT *
                    FROM todos
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    result.lastInsertRowid,
                    req.userId
                );

            res.status(201).json({
                success: true,
                todo
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ذخیره کار ناموفق بود."
            });

        }

    }
);


/* UPDATE TODO */

app.put(
    "/api/planner/todos/:id",
    authenticate,
    (req, res) => {

        try {

            const {
                text,
                completed
            } = req.body;

            const result =
                db.prepare(`
                    UPDATE todos
                    SET
                        text = COALESCE(?, text),
                        completed = COALESCE(?, completed)
                    WHERE id = ?
                    AND user_id = ?
                `).run(
                    text ?? null,
                    completed === undefined
                        ? null
                        : completed ? 1 : 0,
                    Number(req.params.id),
                    req.userId
                );

            if (result.changes === 0) {

                return res.status(404).json({
                    success: false,
                    error: "کار پیدا نشد."
                });

            }

            const todo =
                db.prepare(`
                    SELECT *
                    FROM todos
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    Number(req.params.id),
                    req.userId
                );

            res.json({
                success: true,
                todo
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ویرایش کار ناموفق بود."
            });

        }

    }
);


/* DELETE TODO */

app.delete(
    "/api/planner/todos/:id",
    authenticate,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    DELETE FROM todos
                    WHERE id = ?
                    AND user_id = ?
                `).run(
                    Number(req.params.id),
                    req.userId
                );

            if (result.changes === 0) {

                return res.status(404).json({
                    success: false,
                    error:
                        "کار پیدا نشد."
                });

            }

            res.json({
                success: true
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "حذف کار ناموفق بود."
            });

        }

    }
);


/* =====================================================
   DAILY NOTES
===================================================== */


/* GET NOTE */

app.get(
    "/api/notes",
    authenticate,
    (req, res) => {

        try {

            const noteDate =
                req.query.date || today();

            const note =
                db.prepare(`
                    SELECT *
                    FROM daily_notes
                    WHERE user_id = ?
                    AND note_date = ?
                `).get(
                    req.userId,
                    noteDate
                );

            res.json({
                success: true,
                note: note || {
                    note_date: noteDate,
                    content: ""
                }
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "دریافت یادداشت ناموفق بود."
            });

        }

    }
);


/* SAVE NOTE */

app.post(
    "/api/notes",
    authenticate,
    (req, res) => {

        try {

            const {
                note_date,
                content
            } = req.body;

            const date =
                note_date || today();

            db.prepare(`
                INSERT INTO daily_notes (
                    user_id,
                    note_date,
                    content
                )
                VALUES (?, ?, ?)

                ON CONFLICT(user_id, note_date)
                DO UPDATE SET
                    content = excluded.content
            `).run(
                req.userId,
                date,
                content || ""
            );

            const note =
                db.prepare(`
                    SELECT *
                    FROM daily_notes
                    WHERE user_id = ?
                    AND note_date = ?
                `).get(
                    req.userId,
                    date
                );

            res.json({
                success: true,
                note
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ذخیره یادداشت ناموفق بود."
            });

        }

    }
);


/* =====================================================
   REVIEWS
===================================================== */


/* GET REVIEWS */

app.get(
    "/api/reviews",
    authenticate,
    (req, res) => {

        const reviewDate =
            req.query.date || today();

        const reviews =
            db.prepare(`
                SELECT *
                FROM reviews
                WHERE user_id = ?
                AND review_date = ?
                ORDER BY
                    completed ASC,
                    review_date ASC
            `).all(
                req.userId,
                reviewDate
            );

        res.json({
            success: true,
            reviews
        });

    }
);


/* CREATE REVIEW */

app.post(
    "/api/reviews",
    authenticate,
    (req, res) => {

        try {

            const {
                task_id,
                subject,
                topic,
                study_date,
                interval_days
            } = req.body;

            if (
                !subject ||
                !topic ||
                !study_date ||
                !interval_days
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "اطلاعات مرور کامل نیست."
                });

            }

            const studyDate =
                new Date(study_date);

            studyDate.setDate(
                studyDate.getDate() +
                Number(interval_days)
            );

            const reviewDate =
                studyDate
                    .toISOString()
                    .slice(0, 10);

            const result =
                db.prepare(`
                    INSERT INTO reviews (
                        user_id,
                        task_id,
                        subject,
                        topic,
                        study_date,
                        review_date,
                        interval_days
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    req.userId,
                    task_id || null,
                    subject,
                    topic,
                    study_date,
                    reviewDate,
                    interval_days
                );

            const review =
                db.prepare(`
                    SELECT *
                    FROM reviews
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                review
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ثبت مرور ناموفق بود."
            });

        }

    }
);


/* COMPLETE REVIEW */

app.post(
    "/api/reviews/:id/complete",
    authenticate,
    (req, res) => {

        const reviewId =
            Number(req.params.id);

        const result =
            db.prepare(`
                UPDATE reviews
                SET
                    completed = 1,
                    completed_at =
                        CURRENT_TIMESTAMP
                WHERE id = ?
                AND user_id = ?
            `).run(
                reviewId,
                req.userId
            );

        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                error:
                    "مرور پیدا نشد."
            });

        }

        res.json({
            success: true
        });

    }
);


/* =====================================================
   HABITS
===================================================== */


/* GET HABITS */

app.get(
    "/api/habits",
    authenticate,
    (req, res) => {

        const habits =
            db.prepare(`
                SELECT *
                FROM habits
                WHERE user_id = ?
                AND active = 1
                ORDER BY created_at DESC
            `).all(req.userId);

        res.json({
            success: true,
            habits
        });

    }
);


/* CREATE HABIT */

app.post(
    "/api/habits",
    authenticate,
    (req, res) => {

        const { name } =
            req.body;

        if (!name) {

            return res.status(400).json({
                success: false,
                error:
                    "نام عادت الزامی است."
            });

        }

        const result =
            db.prepare(`
                INSERT INTO habits (
                    user_id,
                    name
                )
                VALUES (?, ?)
            `).run(
                req.userId,
                name
            );

        const habit =
            db.prepare(`
                SELECT *
                FROM habits
                WHERE id = ?
            `).get(
                result.lastInsertRowid
            );

        res.status(201).json({
            success: true,
            habit
        });

    }
);


/* HABIT LOG */

app.post(
    "/api/habits/:id/log",
    authenticate,
    (req, res) => {

        const habitId =
            Number(req.params.id);

        const logDate =
            req.body.log_date || today();

        const completed =
            req.body.completed ? 1 : 0;

        const habit =
            db.prepare(`
                SELECT *
                FROM habits
                WHERE id = ?
                AND user_id = ?
            `).get(
                habitId,
                req.userId
            );

        if (!habit) {

            return res.status(404).json({
                success: false,
                error:
                    "عادت پیدا نشد."
            });

        }

        db.prepare(`
            INSERT INTO habit_logs (
                habit_id,
                user_id,
                log_date,
                completed
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(habit_id, log_date)
            DO UPDATE SET
                completed =
                    excluded.completed
        `).run(
            habitId,
            req.userId,
            logDate,
            completed
        );

        res.json({
            success: true
        });

    }
);


/* HABIT LOGS */

app.get(
    "/api/habits/logs",
    authenticate,
    (req, res) => {

        const logDate =
            req.query.date || today();

        const logs =
            db.prepare(`
                SELECT
                    hl.*,
                    h.name
                FROM habit_logs hl
                JOIN habits h
                    ON h.id = hl.habit_id
                WHERE hl.user_id = ?
                AND hl.log_date = ?
                ORDER BY h.name
            `).all(
                req.userId,
                logDate
            );

        res.json({
            success: true,
            logs
        });

    }
);


/* =====================================================
   STUDY SESSIONS / POMODORO
===================================================== */


/* GET STUDY SESSIONS */

app.get(
    "/api/study-sessions",
    authenticate,
    (req, res) => {

        const sessions =
            db.prepare(`
                SELECT *
                FROM study_sessions
                WHERE user_id = ?
                ORDER BY
                    session_date DESC,
                    created_at DESC
                LIMIT 500
            `).all(req.userId);

        res.json({
            success: true,
            sessions
        });

    }
);


/* CREATE STUDY SESSION */

app.post(
    "/api/study-sessions",
    authenticate,
    (req, res) => {

        try {

            const {
                subject,
                topic,
                duration_minutes,
                session_date,
                timer_type
            } = req.body;

            if (!duration_minutes) {

                return res.status(400).json({
                    success: false,
                    error:
                        "مدت جلسه الزامی است."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO study_sessions (
                        user_id,
                        subject,
                        topic,
                        duration_minutes,
                        session_date,
                        timer_type
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    req.userId,
                    subject || null,
                    topic || null,
                    Number(duration_minutes),
                    session_date || today(),
                    timer_type || "manual"
                );

            const session =
                db.prepare(`
                    SELECT *
                    FROM study_sessions
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                session
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ثبت جلسه مطالعه ناموفق بود."
            });

        }

    }
);


/* =====================================================
   TESTS
===================================================== */


/* GET TESTS */

app.get(
    "/api/tests",
    authenticate,
    (req, res) => {

        const tests =
            db.prepare(`
                SELECT *
                FROM tests
                WHERE user_id = ?
                ORDER BY
                    test_date DESC,
                    created_at DESC
            `).all(req.userId);

        res.json({
            success: true,
            tests
        });

    }
);


/* CREATE TEST */

app.post(
    "/api/tests",
    authenticate,
    (req, res) => {

        try {

            const {
                title,
                subject,
                test_date,
                total_questions,
                correct_questions,
                wrong_questions,
                blank_questions,
                score
            } = req.body;

            if (!title || !test_date) {

                return res.status(400).json({
                    success: false,
                    error:
                        "عنوان و تاریخ آزمون الزامی است."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO tests (
                        user_id,
                        title,
                        subject,
                        test_date,
                        total_questions,
                        correct_questions,
                        wrong_questions,
                        blank_questions,
                        score
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    req.userId,
                    title,
                    subject || null,
                    test_date,
                    Number(total_questions || 0),
                    Number(correct_questions || 0),
                    Number(wrong_questions || 0),
                    Number(blank_questions || 0),
                    Number(score || 0)
                );

            const test =
                db.prepare(`
                    SELECT *
                    FROM tests
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                test
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ثبت آزمون ناموفق بود."
            });

        }

    }
);


/* =====================================================
   GOALS
===================================================== */


/* GET GOALS */

app.get(
    "/api/goals",
    authenticate,
    (req, res) => {

        const goals =
            db.prepare(`
                SELECT *
                FROM goals
                WHERE user_id = ?
                ORDER BY
                    completed ASC,
                    end_date ASC
            `).all(req.userId);

        res.json({
            success: true,
            goals
        });

    }
);


/* CREATE GOAL */

app.post(
    "/api/goals",
    authenticate,
    (req, res) => {

        try {

            const {
                title,
                goal_type,
                target_value,
                start_date,
                end_date
            } = req.body;

            if (!title || !goal_type) {

                return res.status(400).json({
                    success: false,
                    error:
                        "عنوان و نوع هدف الزامی است."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO goals (
                        user_id,
                        title,
                        goal_type,
                        target_value,
                        start_date,
                        end_date
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    req.userId,
                    title,
                    goal_type,
                    target_value || 0,
                    start_date || null,
                    end_date || null
                );

            const goal =
                db.prepare(`
                    SELECT *
                    FROM goals
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                goal
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ثبت هدف ناموفق بود."
            });

        }

    }
);


/* UPDATE GOAL */

app.put(
    "/api/goals/:id",
    authenticate,
    (req, res) => {

        const goalId =
            Number(req.params.id);

        const {
            current_value,
            completed
        } = req.body;

        const result =
            db.prepare(`
                UPDATE goals
                SET
                    current_value =
                        COALESCE(
                            ?,
                            current_value
                        ),
                    completed =
                        COALESCE(
                            ?,
                            completed
                        )
                WHERE id = ?
                AND user_id = ?
            `).run(
                current_value ?? null,
                completed === undefined
                    ? null
                    : completed ? 1 : 0,
                goalId,
                req.userId
            );

        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                error:
                    "هدف پیدا نشد."
            });

        }

        const goal =
            db.prepare(`
                SELECT *
                FROM goals
                WHERE id = ?
                AND user_id = ?
            `).get(
                goalId,
                req.userId
            );

        res.json({
            success: true,
            goal
        });

    }
);


/* =====================================================
   EXAMS
===================================================== */


/* GET EXAMS */

app.get(
    "/api/exams",
    authenticate,
    (req, res) => {

        const exams =
            db.prepare(`
                SELECT *
                FROM exams
                WHERE user_id = ?
                ORDER BY exam_date ASC
            `).all(req.userId);

        res.json({
            success: true,
            exams
        });

    }
);


/* CREATE EXAM */

app.post(
    "/api/exams",
    authenticate,
    (req, res) => {

        try {

            const {
                title,
                exam_date,
                description
            } = req.body;

            if (!title || !exam_date) {

                return res.status(400).json({
                    success: false,
                    error:
                        "عنوان و تاریخ آزمون الزامی است."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO exams (
                        user_id,
                        title,
                        exam_date,
                        description
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    req.userId,
                    title,
                    exam_date,
                    description || null
                );

            const exam =
                db.prepare(`
                    SELECT *
                    FROM exams
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                exam
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "ثبت آزمون ناموفق بود."
            });

        }

    }
);


/* DELETE EXAM */

app.delete(
    "/api/exams/:id",
    authenticate,
    (req, res) => {

        const result =
            db.prepare(`
                DELETE FROM exams
                WHERE id = ?
                AND user_id = ?
            `).run(
                Number(req.params.id),
                req.userId
            );

        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                error:
                    "آزمون پیدا نشد."
            });

        }

        res.json({
            success: true
        });

    }
);


/* =====================================================
   DASHBOARD SUMMARY
===================================================== */

app.get(
    "/api/dashboard/summary",
    authenticate,
    (req, res) => {

        try {

            const date =
                req.query.date || today();

            const tasks =
                db.prepare(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(
                            CASE
                                WHEN completed = 1
                                THEN 1
                                ELSE 0
                            END
                        ) AS completed
                    FROM tasks
                    WHERE user_id = ?
                    AND task_date = ?
                `).get(
                    req.userId,
                    date
                );

            const reviews =
                db.prepare(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(
                            CASE
                                WHEN completed = 1
                                THEN 1
                                ELSE 0
                            END
                        ) AS completed
                    FROM reviews
                    WHERE user_id = ?
                    AND review_date = ?
                `).get(
                    req.userId,
                    date
                );

            const todos =
                db.prepare(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(
                            CASE
                                WHEN completed = 1
                                THEN 1
                                ELSE 0
                            END
                        ) AS completed
                    FROM todos
                    WHERE user_id = ?
                    AND todo_date = ?
                `).get(
                    req.userId,
                    date
                );

            const study =
                db.prepare(`
                    SELECT
                        COALESCE(
                            SUM(duration_minutes),
                            0
                        ) AS minutes
                    FROM study_sessions
                    WHERE user_id = ?
                    AND session_date = ?
                `).get(
                    req.userId,
                    date
                );

            res.json({
                success: true,
                date,
                tasks,
                reviews,
                todos,
                study
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "دریافت آمار داشبورد ناموفق بود."
            });

        }

    }
);


/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
    (err, req, res, next) => {

        console.error(err);

        res.status(500).json({
            success: false,
            error:
                "خطای داخلی سرور."
        });

    }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `StudyMed server running on port ${PORT}`
        );
    }
);
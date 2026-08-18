const app = document.getElementById("app");

/* =====================================================
   STATE
===================================================== */

const state = {
    user: null,
    currentPage: "home",
    selectedDate: today(),

    tasks: [],
    todos: [],
    note: "",
    reviews: [],
    habits: [],
    habitLogs: [],
    sessions: [],
    tests: [],
    goals: [],
    exams: [],

    pomodoro: {
        mode: "work",
        running: false,

        // مدت اصلی تایمر فعلی
        totalSeconds: 25 * 60,

        // زمان باقی‌مانده
        seconds: 25 * 60,

        timer: null,

        completedPomodoros: 0
    }
};


/* =====================================================
   HELPERS
===================================================== */

function today() {

    const d = new Date();

    const year = d.getFullYear();

    const month =
        String(
            d.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            d.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function toPersianNumber(value) {

    return String(value)
        .replace(
            /\d/g,
            d =>
                "۰۱۲۳۴۵۶۷۸۹"[
                    Number(d)
                ]
        );
}


function formatDate(date) {

    if (!date) return "";

    const parts =
        String(date).split("-");

    if (parts.length !== 3) {
        return date;
    }

    return toPersianNumber(
        `${parts[2]}/${parts[1]}/${parts[0]}`
    );
}


function formatTime(seconds) {

    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    if (hours > 0) {

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


/* =====================================================
   API
===================================================== */

async function apiRequest(
    url,
    options = {}
) {

    const token =
        localStorage.getItem(
            "token"
        );

    const headers = {
        "Content-Type":
            "application/json",

        ...(options.headers || {})
    };

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    let data = {};

    try {

        data =
            await response.json();

    } catch {

        data = {};
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            "خطایی در ارتباط با سرور رخ داد."
        );
    }

    return data;
}


/* =====================================================
   LOGIN
===================================================== */

function showLogin() {

    app.innerHTML = `
        <div class="auth-page">

            <div class="auth-card">

                <div class="logo">
                    StudyMed
                </div>

                <div class="subtitle">
                    همراه هوشمند مطالعه و برنامه‌ریزی
                </div>

                <div class="field">

                    <label>
                        نام کاربری یا ایمیل
                    </label>

                    <input
                        id="loginUsername"
                        type="text"
                        placeholder="نام کاربری یا ایمیل"
                    >

                </div>

                <div class="field">

                    <label>
                        رمز عبور
                    </label>

                    <input
                        id="loginPassword"
                        type="password"
                        placeholder="رمز عبور"
                    >

                </div>

                <button
                    class="primary-btn"
                    style="width:100%"
                    id="loginButton"
                >
                    ورود
                </button>

                <button
                    class="secondary-btn"
                    style="width:100%"
                    id="showRegisterButton"
                >
                    ساخت حساب جدید
                </button>

                <div id="authError"></div>

            </div>

        </div>
    `;

    document
        .getElementById(
            "loginButton"
        )
        .addEventListener(
            "click",
            login
        );

    document
        .getElementById(
            "showRegisterButton"
        )
        .addEventListener(
            "click",
            showRegister
        );
}


async function login() {

    const username =
        document
            .getElementById(
                "loginUsername"
            )
            .value
            .trim();

    const password =
        document
            .getElementById(
                "loginPassword"
            )
            .value;

    const errorBox =
        document.getElementById(
            "authError"
        );

    if (!username || !password) {

        errorBox.innerHTML = `
            <div class="error">
                نام کاربری و رمز عبور را وارد کنید.
            </div>
        `;

        return;
    }

    try {

        const result =
            await apiRequest(
                "/api/auth/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            username,
                            password
                        })
                }
            );

        localStorage.setItem(
            "token",
            result.token
        );

        await loadCurrentUser();

    } catch (error) {

        errorBox.innerHTML = `
            <div class="error">
                ${escapeHtml(
                    error.message
                )}
            </div>
        `;
    }
}


/* =====================================================
   REGISTER
===================================================== */

function showRegister() {

    app.innerHTML = `
        <div class="auth-page">

            <div class="auth-card">

                <div class="logo">
                    StudyMed
                </div>

                <div class="subtitle">
                    ساخت حساب کاربری
                </div>

                <div class="field">

                    <label>
                        نام کامل
                    </label>

                    <input
                        id="registerFullName"
                        placeholder="نام و نام خانوادگی"
                    >

                </div>

                <div class="field">

                    <label>
                        نام کاربری
                    </label>

                    <input
                        id="registerUsername"
                        placeholder="نام کاربری"
                    >

                </div>

                <div class="field">

                    <label>
                        ایمیل
                    </label>

                    <input
                        id="registerEmail"
                        type="email"
                        placeholder="ایمیل"
                    >

                </div>

                <div class="field">

                    <label>
                        رشته
                    </label>

                    <input
                        id="registerField"
                        placeholder="مثلاً پزشکی"
                    >

                </div>

                <div class="field">

                    <label>
                        ترم
                    </label>

                    <input
                        id="registerSemester"
                        type="number"
                        placeholder="ترم"
                    >

                </div>

                <div class="field">

                    <label>
                        رمز عبور
                    </label>

                    <input
                        id="registerPassword"
                        type="password"
                        placeholder="رمز عبور"
                    >

                </div>

                <button
                    class="primary-btn"
                    style="width:100%"
                    id="registerButton"
                >
                    ثبت‌نام
                </button>

                <button
                    class="secondary-btn"
                    style="width:100%"
                    id="backLogin"
                >
                    بازگشت به ورود
                </button>

                <div id="registerError"></div>

            </div>

        </div>
    `;

    document
        .getElementById(
            "registerButton"
        )
        .addEventListener(
            "click",
            register
        );

    document
        .getElementById(
            "backLogin"
        )
        .addEventListener(
            "click",
            showLogin
        );
}


async function register() {

    const full_name =
        document
            .getElementById(
                "registerFullName"
            )
            .value
            .trim();

    const username =
        document
            .getElementById(
                "registerUsername"
            )
            .value
            .trim();

    const email =
        document
            .getElementById(
                "registerEmail"
            )
            .value
            .trim();

    const field =
        document
            .getElementById(
                "registerField"
            )
            .value
            .trim();

    const semester =
        Number(
            document
                .getElementById(
                    "registerSemester"
                )
                .value
        ) || 0;

    const password =
        document
            .getElementById(
                "registerPassword"
            )
            .value;

    const errorBox =
        document.getElementById(
            "registerError"
        );

    if (
        !full_name ||
        !username ||
        !email ||
        !password
    ) {

        errorBox.innerHTML = `
            <div class="error">
                اطلاعات ضروری را کامل کنید.
            </div>
        `;

        return;
    }

    try {

        const result =
            await apiRequest(
                "/api/auth/register",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            full_name,
                            username,
                            email,
                            field,
                            semester,
                            password
                        })
                }
            );

        localStorage.setItem(
            "token",
            result.token
        );

        await loadCurrentUser();

    } catch (error) {

        errorBox.innerHTML = `
            <div class="error">
                ${escapeHtml(
                    error.message
                )}
            </div>
        `;
    }
}


/* =====================================================
   NAVIGATION
===================================================== */

function renderNavigation() {

    return `
        <nav class="nav">

            <button data-page="home">
                🏠 خانه
            </button>

            <button data-page="planner">
                📅 برنامه‌ریزی
            </button>

            <button data-page="pomodoro">
                🍅 پومودورو
            </button>

            <button data-page="reviews">
                🔄 مرور
            </button>

            <button data-page="habits">
                🔥 عادت‌ها
            </button>

            <button data-page="tests">
                🧪 آزمون‌ها
            </button>

            <button data-page="goals">
                🎯 اهداف
            </button>

            <button data-page="exams">
                📚 امتحان‌ها
            </button>

            <button data-page="ai">
                🤖 AI Planner
            </button>

        </nav>
    `;
}


function bindNavigation() {

    document
        .querySelectorAll(
            ".nav button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    state.currentPage =
                        page;

                    renderCurrentPage();
                }
            );

        });
}


/* =====================================================
   DASHBOARD
===================================================== */

async function renderDashboard() {

    app.innerHTML = `
        <div
            class="app"
            dir="rtl"
        >

            <header class="header">

                <div>

                    <div class="header-logo">
                        StudyMed
                    </div>

                    <div class="header-info">
                        ${escapeHtml(
                            state.user?.full_name ||
                            ""
                        )}
                    </div>

                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="welcome-row">

                    <div>

                        <h1>
                            سلام
                            ${escapeHtml(
                                state.user?.full_name ||
                                ""
                            )}
                            👋
                        </h1>

                        <p>
                            آماده‌ای امروز هم پیشرفت کنی؟
                        </p>

                    </div>

                    <div class="date-controls">

                        <button id="prevDay">
                            ←
                        </button>

                        <button id="todayButton">
                            امروز
                        </button>

                        <button id="nextDay">
                            →
                        </button>

                    </div>

                </div>

                <div class="grid">

                    <div class="card">

                        <small>
                            برنامه‌های امروز
                        </small>

                        <div class="stat">
                            ${toPersianNumber(
                                state.tasks.length
                            )}
                        </div>

                    </div>

                    <div class="card">

                        <small>
                            کارهای انجام‌نشده
                        </small>

                        <div class="stat">
                            ${toPersianNumber(
                                state.todos.filter(
                                    t =>
                                        !t.completed
                                ).length
                            )}
                        </div>

                    </div>

                    <div class="card">

                        <small>
                            مرورهای امروز
                        </small>

                        <div class="stat">
                            ${toPersianNumber(
                                state.reviews.filter(
                                    r =>
                                        !r.completed
                                ).length
                            )}
                        </div>

                    </div>

                    <div class="card">

                        <small>
                            زمان مطالعه امروز
                        </small>

                        <div class="stat">
                            ${toPersianNumber(
                                getTodayStudyMinutes()
                            )}
                            دقیقه
                        </div>

                    </div>

                </div>

                ${renderPlannerContent()}

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "prevDay"
        )
        ?.addEventListener(
            "click",
            () =>
                changeDate(-1)
        );

    document
        .getElementById(
            "nextDay"
        )
        ?.addEventListener(
            "click",
            () =>
                changeDate(1)
        );

    document
        .getElementById(
            "todayButton"
        )
        ?.addEventListener(
            "click",
            () => {

                state.selectedDate =
                    today();

                loadPlannerData()
                    .then(
                        renderDashboard
                    );
            }
        );

    bindPlannerEvents();
}


function renderPlannerContent() {

    const hours = [
        "۰۶:۰۰",
        "۰۷:۰۰",
        "۰۸:۰۰",
        "۰۹:۰۰",
        "۱۰:۰۰",
        "۱۱:۰۰",
        "۱۲:۰۰",
        "۱۳:۰۰",
        "۱۴:۰۰",
        "۱۵:۰۰",
        "۱۶:۰۰",
        "۱۷:۰۰",
        "۱۸:۰۰",
        "۱۹:۰۰",
        "۲۰:۰۰",
        "۲۱:۰۰",
        "۲۲:۰۰"
    ];

    return `
        <section class="planner-section">

            <div class="section-header">

                <div>

                    <h2>
                        برنامه امروز
                    </h2>

                    <p>
                        ${formatDate(
                            state.selectedDate
                        )}
                    </p>

                </div>

                <button
                    class="primary-btn"
                    id="addTaskBtn"
                >
                    + برنامه جدید
                </button>

            </div>

            <div class="planner-layout">

                <div class="planner-timeline">

                    ${hours.map(hour => {

                        const numericHour =
                            Number(
                                hour
                                    .replace(
                                        /[۰-۹]/g,
                                        d =>
                                            "۰۱۲۳۴۵۶۷۸۹"
                                                .indexOf(d)
                                    )
                                    .slice(
                                        0,
                                        2
                                    )
                            );

                        const tasks =
                            state.tasks.filter(
                                task => {

                                    const start =
                                        Number(
                                            String(
                                                task.start_time ||
                                                "00:00"
                                            )
                                            .split(":")[0]
                                        );

                                    return (
                                        start ===
                                        numericHour
                                    );
                                }
                            );

                        return `
                            <div class="time-row">

                                <div class="time-label">
                                    ${hour}
                                </div>

                                <div class="time-content">

                                    ${
                                        tasks.length
                                            ? tasks
                                                .map(
                                                    renderTask
                                                )
                                                .join("")
                                            : `
                                                <div class="empty-slot">
                                                    زمان آزاد
                                                </div>
                                            `
                                    }

                                </div>

                            </div>
                        `;

                    }).join("")}

                </div>

                <div class="side-panel">

                    <div class="mini-card">

                        <h3>
                            📝 کارهای امروز
                        </h3>

                        <div class="todo-add">

                            <input
                                id="todoInput"
                                placeholder="کار جدید..."
                            >

                            <button id="addTodo">
                                +
                            </button>

                        </div>

                        <div id="todoList">

                            ${
                                state.todos.length
                                    ? state.todos
                                        .map(
                                            renderTodo
                                        )
                                        .join("")
                                    : `
                                        <p class="muted">
                                            هنوز کاری ثبت نشده.
                                        </p>
                                    `
                            }

                        </div>

                    </div>

                    <div class="mini-card">

                        <h3>
                            📝 یادداشت امروز
                        </h3>

                        <textarea
                            id="dailyNote"
                        >${escapeHtml(
                            state.note
                        )}</textarea>

                        <button
                            class="primary-btn"
                            id="saveNote"
                            style="width:100%"
                        >
                            ذخیره یادداشت
                        </button>

                    </div>

                </div>

            </div>

        </section>
    `;
}


function renderTask(task) {

    return `
        <div
            class="task ${
                task.completed
                    ? "completed"
                    : ""
            }"
        >

            <div class="task-check">

                <input
                    type="checkbox"
                    data-complete="${task.id}"
                    ${
                        task.completed
                            ? "checked"
                            : ""
                    }
                >

            </div>

            <div class="task-info">

                <strong>
                    ${escapeHtml(
                        task.title
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        task.subject ||
                        ""
                    )}
                </span>

            </div>

            <div class="task-meta">

                <span>
                    ${escapeHtml(
                        task.start_time
                    )}
                    -
                    ${escapeHtml(
                        task.end_time
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        task.category ||
                        ""
                    )}
                </span>

            </div>

            <button
                class="delete-task"
                data-delete="${task.id}"
            >
                ×
            </button>

        </div>
    `;
}


function renderTodo(todo) {

    return `
        <div
            class="todo ${
                todo.completed
                    ? "completed"
                    : ""
            }"
        >

            <input
                type="checkbox"
                data-todo="${todo.id}"
                ${
                    todo.completed
                        ? "checked"
                        : ""
                }
            >

            <span>
                ${escapeHtml(
                    todo.text
                )}
            </span>

            <button
                data-delete-todo="${todo.id}"
            >
                ×
            </button>

        </div>
    `;
}


/* =====================================================
   PLANNER
===================================================== */

async function loadPlannerData() {

    try {

        const [
            tasks,
            todos,
            note,
            reviews
        ] = await Promise.all([

            apiRequest(
                `/api/planner/tasks?date=${state.selectedDate}`
            ),

            apiRequest(
                `/api/planner/todos?date=${state.selectedDate}`
            ),

            apiRequest(
                `/api/notes?date=${state.selectedDate}`
            ),

            apiRequest(
                `/api/reviews?date=${state.selectedDate}`
            )

        ]);

        state.tasks =
            tasks.tasks || [];

        state.todos =
            todos.todos || [];

        state.note =
            note.note?.content || "";

        state.reviews =
            reviews.reviews || [];

    } catch (error) {

        console.error(
            "Planner loading error:",
            error
        );
    }
}


function changeDate(amount) {

    const date =
        new Date(
            `${state.selectedDate}T00:00:00`
        );

    date.setDate(
        date.getDate() + amount
    );

    state.selectedDate =
        date.toISOString()
            .slice(0, 10);

    loadPlannerData()
        .then(
            renderDashboard
        );
}


/* =====================================================
   TASK MODAL
===================================================== */

function showTaskModal() {

    document
        .getElementById(
            "taskModal"
        )
        ?.remove();

    document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div
            class="modal-overlay"
            id="taskModal"
        >

            <div class="modal">

                <div class="modal-header">

                    <h2>
                        افزودن برنامه
                    </h2>

                    <button
                        id="closeTaskModal"
                    >
                        ×
                    </button>

                </div>

                <div class="field">

                    <label>
                        عنوان
                    </label>

                    <input
                        id="taskTitle"
                        placeholder="مثلاً مطالعه فیزیولوژی"
                    >

                </div>

                <div class="field">

                    <label>
                        درس
                    </label>

                    <input
                        id="taskSubject"
                        placeholder="فیزیولوژی"
                    >

                </div>

                <div class="field">

                    <label>
                        دسته‌بندی
                    </label>

                    <select id="taskCategory">

                        <option>
                            درس اصلی
                        </option>

                        <option>
                            مرور
                        </option>

                        <option>
                            تست
                        </option>

                        <option>
                            زبان
                        </option>

                        <option>
                            استراحت
                        </option>

                    </select>

                </div>

                <div class="time-inputs">

                    <div class="field">

                        <label>
                            شروع
                        </label>

                        <input
                            id="taskStart"
                            type="time"
                            value="08:00"
                        >

                    </div>

                    <div class="field">

                        <label>
                            پایان
                        </label>

                        <input
                            id="taskEnd"
                            type="time"
                            value="09:00"
                        >

                    </div>

                </div>

                <button
                    class="primary-btn"
                    id="saveTask"
                    style="width:100%"
                >
                    ذخیره برنامه
                </button>

                <div id="taskError"></div>

            </div>

        </div>
        `
    );

    document
        .getElementById(
            "closeTaskModal"
        )
        .addEventListener(
            "click",
            closeTaskModal
        );

    document
        .getElementById(
            "saveTask"
        )
        .addEventListener(
            "click",
            createTask
        );
}


function closeTaskModal() {

    document
        .getElementById(
            "taskModal"
        )
        ?.remove();
}


async function createTask() {

    const title =
        document
            .getElementById(
                "taskTitle"
            )
            .value
            .trim();

    const subject =
        document
            .getElementById(
                "taskSubject"
            )
            .value
            .trim();

    const category =
        document
            .getElementById(
                "taskCategory"
            )
            .value;

    const start_time =
        document
            .getElementById(
                "taskStart"
            )
            .value;

    const end_time =
        document
            .getElementById(
                "taskEnd"
            )
            .value;

    const errorBox =
        document.getElementById(
            "taskError"
        );

    if (
        !title ||
        !start_time ||
        !end_time
    ) {

        errorBox.innerHTML = `
            <div class="error">
                اطلاعات برنامه را کامل کنید.
            </div>
        `;

        return;
    }

    if (end_time <= start_time) {

        errorBox.innerHTML = `
            <div class="error">
                زمان پایان باید بعد از زمان شروع باشد.
            </div>
        `;

        return;
    }

    try {

        await apiRequest(
            "/api/planner/tasks",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        title,
                        subject,
                        category,
                        task_date:
                            state.selectedDate,
                        start_time,
                        end_time
                    })
            }
        );

        closeTaskModal();

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        errorBox.innerHTML = `
            <div class="error">
                ${escapeHtml(
                    error.message
                )}
            </div>
        `;
    }
}


async function toggleTask(id) {

    const task =
        state.tasks.find(
            item =>
                item.id === id
        );

    if (!task) return;

    try {

        await apiRequest(
            `/api/planner/tasks/${id}`,
            {
                method: "PUT",

                body:
                    JSON.stringify({
                        completed:
                            !Boolean(
                                task.completed
                            )
                    })
            }
        );

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        alert(error.message);
    }
}


async function deleteTask(id) {

    if (
        !confirm(
            "آیا این برنامه حذف شود؟"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/api/planner/tasks/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   TODO
===================================================== */

async function addTodoItem() {

    const input =
        document.getElementById(
            "todoInput"
        );

    if (!input) return;

    const text =
        input.value.trim();

    if (!text) return;

    try {

        await apiRequest(
            "/api/planner/todos",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        text,
                        todo_date:
                            state.selectedDate
                    })
            }
        );

        input.value = "";

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        alert(error.message);
    }
}


async function toggleTodo(id) {

    const todo =
        state.todos.find(
            item =>
                item.id === id
        );

    if (!todo) return;

    try {

        await apiRequest(
            `/api/planner/todos/${id}`,
            {
                method: "PUT",

                body:
                    JSON.stringify({
                        completed:
                            !Boolean(
                                todo.completed
                            )
                    })
            }
        );

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        alert(error.message);
    }
}


async function deleteTodo(id) {

    try {

        await apiRequest(
            `/api/planner/todos/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadPlannerData();

        renderDashboard();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   NOTE
===================================================== */

async function saveDailyNote() {

    const textarea =
        document.getElementById(
            "dailyNote"
        );

    if (!textarea) return;

    try {

        await apiRequest(
            "/api/notes",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        note_date:
                            state.selectedDate,

                        content:
                            textarea.value
                    })
            }
        );

        state.note =
            textarea.value;

        const button =
            document.getElementById(
                "saveNote"
            );

        if (button) {

            button.textContent =
                "ذخیره شد ✓";

            setTimeout(
                () => {

                    button.textContent =
                        "ذخیره یادداشت";

                },
                1500
            );
        }

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   🍅 POMODORO
===================================================== */

/*
    تایمرهای آماده:

    مطالعه:
    25 دقیقه
    50 دقیقه

    استراحت:
    5 دقیقه
    15 دقیقه

    تایمر دلخواه:
    هر تعداد دقیقه‌ای که کاربر وارد کند.
*/


function renderPomodoroPage() {

    app.innerHTML = `
        <div
            class="app"
            dir="rtl"
        >

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🍅 پومودورو
                    </h1>

                    <p>
                        تایمر مطالعه‌ات را خودت انتخاب کن.
                    </p>


                    <!-- =========================
                         TIMER
                    ========================== -->

                    <div
                        style="
                            text-align:center;
                            padding:30px 10px;
                        "
                    >

                        <div
                            id="pomodoroMode"
                            style="
                                font-size:20px;
                                font-weight:800;
                                margin-bottom:20px;
                            "
                        >
                            📚 مطالعه
                        </div>


                        <div
                            id="pomodoroTimer"
                            style="
                                font-size:80px;
                                font-weight:900;
                                letter-spacing:4px;
                                margin-bottom:25px;
                            "
                        >
                            ${formatTime(
                                state.pomodoro.seconds
                            )}
                        </div>


                        <!-- =========================
                             MAIN CONTROLS
                        ========================== -->

                        <div
                            style="
                                display:flex;
                                justify-content:center;
                                gap:10px;
                                flex-wrap:wrap;
                            "
                        >

                            <button
                                class="primary-btn"
                                id="pomodoroStart"
                            >
                                شروع
                            </button>

                            <button
                                class="secondary-btn"
                                id="pomodoroPause"
                            >
                                توقف
                            </button>

                            <button
                                class="secondary-btn"
                                id="pomodoroReset"
                            >
                                شروع مجدد
                            </button>

                        </div>


                        <!-- =========================
                             READY STUDY TIMERS
                        ========================== -->

                        <div
                            style="
                                margin-top:35px;
                            "
                        >

                            <h3>
                                🍅 تایمرهای آماده مطالعه
                            </h3>

                            <div
                                style="
                                    display:flex;
                                    justify-content:center;
                                    gap:10px;
                                    flex-wrap:wrap;
                                    margin-top:15px;
                                "
                            >

                                <button
                                    class="secondary-btn"
                                    id="preset25"
                                >
                                    🍅 ۲۵ دقیقه
                                </button>

                                <button
                                    class="secondary-btn"
                                    id="preset50"
                                >
                                    🔥 ۵۰ دقیقه
                                </button>

                            </div>

                        </div>


                        <!-- =========================
                             BREAK TIMERS
                        ========================== -->

                        <div
                            style="
                                margin-top:30px;
                            "
                        >

                            <h3>
                                ☕ تایمرهای استراحت
                            </h3>

                            <div
                                style="
                                    display:flex;
                                    justify-content:center;
                                    gap:10px;
                                    flex-wrap:wrap;
                                    margin-top:15px;
                                "
                            >

                                <button
                                    class="secondary-btn"
                                    id="presetShortBreak"
                                >
                                    ☕ ۵ دقیقه
                                </button>

                                <button
                                    class="secondary-btn"
                                    id="presetLongBreak"
                                >
                                    🌿 ۱۵ دقیقه
                                </button>

                            </div>

                        </div>


                        <!-- =========================
                             CUSTOM TIMER
                        ========================== -->

                        <div
                            class="mini-card"
                            style="
                                margin-top:30px;
                                text-align:right;
                            "
                        >

                            <h3>
                                ⚙️ تایمر دلخواه من
                            </h3>

                            <p class="muted">
                                هر چند دقیقه که خواستی وارد کن.
                            </p>

                            <div
                                style="
                                    display:flex;
                                    gap:10px;
                                    align-items:end;
                                    flex-wrap:wrap;
                                "
                            >

                                <div
                                    class="field"
                                    style="
                                        flex:1;
                                        min-width:180px;
                                    "
                                >

                                    <label>
                                        مدت زمان (دقیقه)
                                    </label>

                                    <input
                                        id="customMinutes"
                                        type="number"
                                        min="1"
                                        max="600"
                                        step="1"
                                        placeholder="مثلاً ۴۵"
                                    >

                                </div>

                                <button
                                    class="primary-btn"
                                    id="applyCustomTimer"
                                >
                                    اعمال تایمر
                                </button>

                            </div>

                            <div
                                id="customTimerError"
                                style="margin-top:10px"
                            ></div>

                        </div>


                        <!-- =========================
                             STATS
                        ========================== -->

                        <div
                            class="grid"
                            style="
                                margin-top:30px;
                            "
                        >

                            <div class="card">

                                <small>
                                    پومودوروهای امروز
                                </small>

                                <div
                                    class="stat"
                                    id="pomodoroCount"
                                >
                                    ${toPersianNumber(
                                        state
                                            .pomodoro
                                            .completedPomodoros
                                    )}
                                </div>

                            </div>


                            <div class="card">

                                <small>
                                    زمان مطالعه امروز
                                </small>

                                <div
                                    class="stat"
                                    id="pomodoroStudyMinutes"
                                >
                                    ${toPersianNumber(
                                        getTodayStudyMinutes()
                                    )}
                                    دقیقه
                                </div>

                            </div>

                        </div>


                        <div
                            id="pomodoroStatus"
                            style="
                                margin-top:25px;
                                color:#777;
                                font-weight:600;
                            "
                        >
                            آماده‌ای؟ 🍅
                        </div>

                    </div>

                </div>

            </main>

        </div>
    `;


    bindNavigation();


    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );


    document
        .getElementById(
            "pomodoroStart"
        )
        ?.addEventListener(
            "click",
            startPomodoro
        );


    document
        .getElementById(
            "pomodoroPause"
        )
        ?.addEventListener(
            "click",
            pausePomodoro
        );


    document
        .getElementById(
            "pomodoroReset"
        )
        ?.addEventListener(
            "click",
            resetPomodoro
        );


    document
        .getElementById(
            "preset25"
        )
        ?.addEventListener(
            "click",
            () =>
                setPomodoroTimer(
                    "work",
                    25
                )
        );


    document
        .getElementById(
            "preset50"
        )
        ?.addEventListener(
            "click",
            () =>
                setPomodoroTimer(
                    "work",
                    50
                )
        );


    document
        .getElementById(
            "presetShortBreak"
        )
        ?.addEventListener(
            "click",
            () =>
                setPomodoroTimer(
                    "short",
                    5
                )
        );


    document
        .getElementById(
            "presetLongBreak"
        )
        ?.addEventListener(
            "click",
            () =>
                setPomodoroTimer(
                    "long",
                    15
                )
        );


    document
        .getElementById(
            "applyCustomTimer"
        )
        ?.addEventListener(
            "click",
            applyCustomPomodoro
        );


    document
        .getElementById(
            "customMinutes"
        )
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    applyCustomPomodoro();
                }

            }
        );


    updatePomodoroUI();
}


/* =====================================================
   POMODORO START
===================================================== */

function startPomodoro() {

    if (
        state.pomodoro.running
    ) {
        return;
    }

    if (
        state.pomodoro.seconds <= 0
    ) {

        resetPomodoro();
    }

    state.pomodoro.running =
        true;

    state.pomodoro.timer =
        setInterval(
            pomodoroTick,
            1000
        );

    updatePomodoroUI();
}


/* =====================================================
   POMODORO PAUSE
===================================================== */

function pausePomodoro() {

    state.pomodoro.running =
        false;

    clearInterval(
        state.pomodoro.timer
    );

    state.pomodoro.timer =
        null;

    updatePomodoroUI();
}


/* =====================================================
   POMODORO RESET
===================================================== */

function resetPomodoro() {

    pausePomodoro();

    state.pomodoro.seconds =
        state.pomodoro.totalSeconds;

    updatePomodoroUI();
}


/* =====================================================
   SET PRESET TIMER
===================================================== */

function setPomodoroTimer(
    mode,
    minutes
) {

    pausePomodoro();

    state.pomodoro.mode =
        mode;

    state.pomodoro.totalSeconds =
        minutes * 60;

    state.pomodoro.seconds =
        minutes * 60;

    updatePomodoroUI();
}


/* =====================================================
   CUSTOM TIMER
===================================================== */

function applyCustomPomodoro() {

    const input =
        document.getElementById(
            "customMinutes"
        );

    const errorBox =
        document.getElementById(
            "customTimerError"
        );

    if (!input) return;

    const minutes =
        Number(
            input.value
        );

    if (
        !Number.isFinite(
            minutes
        ) ||
        minutes <= 0
    ) {

        errorBox.innerHTML = `
            <div class="error">
                لطفاً یک زمان معتبر وارد کن.
            </div>
        `;

        return;
    }

    if (minutes > 600) {

        errorBox.innerHTML = `
            <div class="error">
                حداکثر زمان تایمر ۶۰۰ دقیقه است.
            </div>
        `;

        return;
    }

    errorBox.innerHTML = "";

    setPomodoroTimer(
        "custom",
        minutes
    );

    /*
        بعد از اعمال تایمر،
        خودش شروع نمی‌شود.
        کاربر می‌تواند زمان را بررسی کند
        و بعد روی شروع بزند.
    */
}


/* =====================================================
   POMODORO TICK
===================================================== */

function pomodoroTick() {

    if (
        state.pomodoro.seconds <= 0
    ) {

        completePomodoro();

        return;
    }

    state.pomodoro.seconds--;

    updatePomodoroUI();
}


/* =====================================================
   COMPLETE POMODORO
===================================================== */

async function completePomodoro() {

    pausePomodoro();

    const mode =
        state.pomodoro.mode;

    const totalMinutes =
        Math.max(
            1,
            Math.round(
                state.pomodoro.totalSeconds /
                60
            )
        );


    /*
        هر تایمر مطالعه‌ای
        به عنوان جلسه مطالعه ثبت می‌شود.

        شامل:
        25 دقیقه
        50 دقیقه
        تایمر دلخواه
    */

    if (
        mode === "work" ||
        mode === "custom"
    ) {

        state.pomodoro.completedPomodoros++;


        try {

            await apiRequest(
                "/api/study-sessions",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            subject:
                                "مطالعه",

                            topic:
                                "پومودورو",

                            duration_minutes:
                                totalMinutes,

                            session_date:
                                today(),

                            timer_type:
                                "pomodoro"
                        })
                }
            );


            await loadStudySessions();

        } catch (error) {

            console.error(
                "Pomodoro save error:",
                error
            );
        }

    }


    if (
        mode === "short" ||
        mode === "long"
    ) {

        alert(
            "⏰ زمان استراحت تمام شد! آماده مطالعه‌ای؟"
        );

    } else {

        alert(
            `🍅 تایمر ${toPersianNumber(
                totalMinutes
            )} دقیقه‌ای تمام شد! آفرین بهت 🎉`
        );

    }


    updatePomodoroUI();
}


/* =====================================================
   POMODORO UI
===================================================== */

function updatePomodoroUI() {

    const timer =
        document.getElementById(
            "pomodoroTimer"
        );

    if (!timer) return;


    timer.textContent =
        formatTime(
            state.pomodoro.seconds
        );


    const mode =
        document.getElementById(
            "pomodoroMode"
        );


    if (mode) {

        if (
            state.pomodoro.mode ===
            "work"
        ) {

            mode.textContent =
                "📚 مطالعه";

        } else if (
            state.pomodoro.mode ===
            "custom"
        ) {

            mode.textContent =
                "⚙️ مطالعه با زمان دلخواه";

        } else if (
            state.pomodoro.mode ===
            "short"
        ) {

            mode.textContent =
                "☕ استراحت کوتاه";

        } else {

            mode.textContent =
                "🌿 استراحت بلند";
        }
    }


    const status =
        document.getElementById(
            "pomodoroStatus"
        );


    if (status) {

        if (
            state.pomodoro.running
        ) {

            status.textContent =
                "در حال تمرکز... 🔥";

        } else {

            status.textContent =
                "تایمر متوقف است.";
        }
    }


    const start =
        document.getElementById(
            "pomodoroStart"
        );


    if (start) {

        start.textContent =
            state.pomodoro.running
                ? "در حال اجرا..."
                : "شروع";
    }


    const count =
        document.getElementById(
            "pomodoroCount"
        );


    if (count) {

        count.textContent =
            toPersianNumber(
                state
                    .pomodoro
                    .completedPomodoros
            );
    }


    const studyMinutes =
        document.getElementById(
            "pomodoroStudyMinutes"
        );


    if (studyMinutes) {

        studyMinutes.textContent =
            `${toPersianNumber(
                getTodayStudyMinutes()
            )} دقیقه`;
    }
}


/* =====================================================
   REVIEWS
===================================================== */

async function renderReviewsPage() {

    try {

        const result =
            await apiRequest(
                `/api/reviews?date=${state.selectedDate}`
            );

        state.reviews =
            result.reviews || [];

    } catch (error) {

        console.error(error);
    }

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🔄 مرورهای امروز
                    </h1>

                    <p>
                        مرورهای برنامه‌ریزی‌شده‌ات را انجام بده.
                    </p>

                    <div
                        id="reviewsList"
                        class="category-list"
                    >

                        ${
                            state.reviews.length
                                ? state.reviews
                                    .map(
                                        renderReview
                                    )
                                    .join("")
                                : `
                                    <div class="empty-slot">
                                        مرور امروز نداری.
                                    </div>
                                `
                        }

                    </div>

                    <hr>

                    <h3>
                        افزودن مرور
                    </h3>

                    <div class="field">

                        <input
                            id="reviewSubject"
                            placeholder="درس"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="reviewTopic"
                            placeholder="موضوع"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="reviewStudyDate"
                            type="date"
                            value="${state.selectedDate}"
                        >

                    </div>

                    <div class="field">

                        <select id="reviewInterval">

                            <option value="1">
                                ۱ روز بعد
                            </option>

                            <option value="3">
                                ۳ روز بعد
                            </option>

                            <option value="7">
                                ۷ روز بعد
                            </option>

                            <option value="14">
                                ۱۴ روز بعد
                            </option>

                            <option value="21">
                                ۲۱ روز بعد
                            </option>

                            <option value="30">
                                ۳۰ روز بعد
                            </option>

                        </select>

                    </div>

                    <button
                        class="primary-btn"
                        id="addReview"
                    >
                        افزودن مرور
                    </button>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "addReview"
        )
        ?.addEventListener(
            "click",
            createReview
        );

    document
        .querySelectorAll(
            "[data-review]"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () =>
                        completeReview(
                            Number(
                                checkbox.dataset.review
                            )
                        )
                );

            }
        );
}


function renderReview(review) {

    return `
        <div
            class="category-list"
            style="
                margin-bottom:10px;
                padding:12px;
                background:#f7f7f7;
                border-radius:12px;
            "
        >

            <label>

                <input
                    type="checkbox"
                    data-review="${review.id}"
                    ${
                        review.completed
                            ? "checked"
                            : ""
                    }
                >

                <strong>
                    ${escapeHtml(
                        review.subject
                    )}
                </strong>

                —
                ${escapeHtml(
                    review.topic
                )}

            </label>

        </div>
    `;
}


async function createReview() {

    const subject =
        document
            .getElementById(
                "reviewSubject"
            )
            .value
            .trim();

    const topic =
        document
            .getElementById(
                "reviewTopic"
            )
            .value
            .trim();

    const study_date =
        document
            .getElementById(
                "reviewStudyDate"
            )
            .value;

    const interval_days =
        Number(
            document
                .getElementById(
                    "reviewInterval"
                )
                .value
        );

    if (
        !subject ||
        !topic ||
        !study_date
    ) {

        alert(
            "اطلاعات مرور را کامل کنید."
        );

        return;
    }

    try {

        await apiRequest(
            "/api/reviews",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        subject,
                        topic,
                        study_date,
                        interval_days
                    })
            }
        );

        renderReviewsPage();

    } catch (error) {

        alert(error.message);
    }
}


async function completeReview(id) {

    try {

        await apiRequest(
            `/api/reviews/${id}/complete`,
            {
                method: "POST"
            }
        );

        renderReviewsPage();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   HABITS
===================================================== */

async function renderHabitsPage() {

    try {

        const [
            habits,
            logs
        ] =
            await Promise.all([

                apiRequest(
                    "/api/habits"
                ),

                apiRequest(
                    `/api/habits/logs?date=${state.selectedDate}`
                )

            ]);

        state.habits =
            habits.habits || [];

        state.habitLogs =
            logs.logs || [];

    } catch (error) {

        console.error(error);
    }

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🔥 عادت‌ها
                    </h1>

                    <p>
                        هر روز فقط یک قدم کوچک.
                    </p>

                    <div class="todo-add">

                        <input
                            id="habitName"
                            placeholder="مثلاً مطالعه روزانه"
                        >

                        <button
                            id="addHabit"
                        >
                            +
                        </button>

                    </div>

                    <div
                        style="
                            margin-top:20px;
                        "
                    >

                        ${
                            state.habits.length
                                ? state.habits
                                    .map(
                                        renderHabit
                                    )
                                    .join("")
                                : `
                                    <div class="empty-slot">
                                        هنوز عادتی ثبت نشده.
                                    </div>
                                `
                        }

                    </div>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "addHabit"
        )
        ?.addEventListener(
            "click",
            createHabit
        );

    document
        .querySelectorAll(
            "[data-habit]"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () =>
                        toggleHabit(
                            Number(
                                checkbox.dataset.habit
                            )
                        )
                );

            }
        );
}


function renderHabit(habit) {

    const log =
        state.habitLogs.find(
            item =>
                item.habit_id ===
                habit.id
        );

    const completed =
        Boolean(
            log?.completed
        );

    return `
        <div
            class="todo ${
                completed
                    ? "completed"
                    : ""
            }"
        >

            <input
                type="checkbox"
                data-habit="${habit.id}"
                ${
                    completed
                        ? "checked"
                        : ""
                }
            >

            <span>
                ${escapeHtml(
                    habit.name
                )}
            </span>

        </div>
    `;
}


async function createHabit() {

    const input =
        document.getElementById(
            "habitName"
        );

    const name =
        input.value.trim();

    if (!name) return;

    try {

        await apiRequest(
            "/api/habits",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        name
                    })
            }
        );

        renderHabitsPage();

    } catch (error) {

        alert(error.message);
    }
}


async function toggleHabit(id) {

    const log =
        state.habitLogs.find(
            item =>
                item.habit_id ===
                id
        );

    const completed =
        !Boolean(
            log?.completed
        );

    try {

        await apiRequest(
            `/api/habits/${id}/log`,
            {
                method: "POST",

                body:
                    JSON.stringify({
                        log_date:
                            state.selectedDate,

                        completed
                    })
            }
        );

        renderHabitsPage();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   TESTS
===================================================== */

async function renderTestsPage() {

    try {

        const result =
            await apiRequest(
                "/api/tests"
            );

        state.tests =
            result.tests || [];

    } catch (error) {

        console.error(error);
    }

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🧪 آزمون‌ها
                    </h1>

                    <p>
                        نتیجه آزمون‌هایت را ثبت و بررسی کن.
                    </p>

                    <div class="field">

                        <input
                            id="testTitle"
                            placeholder="نام آزمون"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testSubject"
                            placeholder="درس"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testDate"
                            type="date"
                            value="${today()}"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testTotal"
                            type="number"
                            placeholder="تعداد کل سوال"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testCorrect"
                            type="number"
                            placeholder="صحیح"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testWrong"
                            type="number"
                            placeholder="غلط"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="testBlank"
                            type="number"
                            placeholder="نزده"
                        >

                    </div>

                    <button
                        class="primary-btn"
                        id="saveTest"
                    >
                        ثبت آزمون
                    </button>

                    <div
                        id="testResult"
                        style="margin-top:20px"
                    ></div>

                    <hr>

                    <div id="testsList">

                        ${
                            state.tests
                                .map(
                                    renderTest
                                )
                                .join("")
                        }

                    </div>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "saveTest"
        )
        ?.addEventListener(
            "click",
            saveTest
        );
}


function renderTest(test) {

    return `
        <div class="mini-card">

            <strong>
                ${escapeHtml(
                    test.title
                )}
            </strong>

            <p>
                ${escapeHtml(
                    test.subject ||
                    ""
                )}
            </p>

            <p>
                صحیح:
                ${toPersianNumber(
                    test.correct_questions
                )}
                |
                غلط:
                ${toPersianNumber(
                    test.wrong_questions
                )}
                |
                نزده:
                ${toPersianNumber(
                    test.blank_questions
                )}
            </p>

            <strong>
                درصد:
                ${toPersianNumber(
                    Number(
                        test.score ||
                        0
                    ).toFixed(1)
                )}٪
            </strong>

        </div>
    `;
}


async function saveTest() {

    const title =
        document
            .getElementById(
                "testTitle"
            )
            .value
            .trim();

    const subject =
        document
            .getElementById(
                "testSubject"
            )
            .value
            .trim();

    const test_date =
        document
            .getElementById(
                "testDate"
            )
            .value;

    const total =
        Number(
            document
                .getElementById(
                    "testTotal"
                )
                .value
        ) || 0;

    const correct =
        Number(
            document
                .getElementById(
                    "testCorrect"
                )
                .value
        ) || 0;

    const wrong =
        Number(
            document
                .getElementById(
                    "testWrong"
                )
                .value
        ) || 0;

    const blank =
        Number(
            document
                .getElementById(
                    "testBlank"
                )
                .value
        ) || 0;

    if (
        !title ||
        !test_date
    ) {

        alert(
            "عنوان و تاریخ آزمون الزامی است."
        );

        return;
    }

    const score =
        total > 0
            ? (
                (
                    correct -
                    wrong / 3
                ) /
                total
            ) * 100
            : 0;

    try {

        await apiRequest(
            "/api/tests",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        title,
                        subject,
                        test_date,
                        total_questions:
                            total,
                        correct_questions:
                            correct,
                        wrong_questions:
                            wrong,
                        blank_questions:
                            blank,
                        score
                    })
            }
        );

        document.getElementById(
            "testResult"
        ).innerHTML = `
            <div class="card">

                <h3>
                    نتیجه آزمون 🎉
                </h3>

                <strong>
                    درصد:
                    ${toPersianNumber(
                        Math.max(
                            0,
                            score
                        ).toFixed(1)
                    )}٪
                </strong>

            </div>
        `;

        renderTestsPage();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   GOALS
===================================================== */

async function renderGoalsPage() {

    try {

        const result =
            await apiRequest(
                "/api/goals"
            );

        state.goals =
            result.goals || [];

    } catch (error) {

        console.error(error);
    }

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🎯 اهداف من
                    </h1>

                    <p>
                        هدف تعیین کن و قدم‌به‌قدم جلو برو.
                    </p>

                    <div class="field">

                        <input
                            id="goalTitle"
                            placeholder="مثلاً قبولی لیسانس به پزشکی"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="goalTarget"
                            type="number"
                            placeholder="مقدار هدف"
                        >

                    </div>

                    <button
                        class="primary-btn"
                        id="addGoal"
                    >
                        افزودن هدف
                    </button>

                    <div
                        id="goalsList"
                        style="margin-top:20px"
                    >

                        ${
                            state.goals.length
                                ? state.goals
                                    .map(
                                        renderGoal
                                    )
                                    .join("")
                                : `
                                    <div class="empty-slot">
                                        هنوز هدفی ثبت نشده.
                                    </div>
                                `
                        }

                    </div>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "addGoal"
        )
        ?.addEventListener(
            "click",
            createGoal
        );

    document
        .querySelectorAll(
            "[data-goal-increase]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    increaseGoal(
                        Number(
                            button.dataset
                                .goalIncrease
                        )
                    )
            );

        });
}


function renderGoal(goal) {

    const current =
        Number(
            goal.current_value ||
            0
        );

    const target =
        Number(
            goal.target_value ||
            0
        );

    const percent =
        target > 0
            ? Math.min(
                100,
                (current / target) *
                100
            )
            : 0;

    return `
        <div class="mini-card">

            <strong>
                ${escapeHtml(
                    goal.title
                )}
            </strong>

            <p>
                پیشرفت:
                ${toPersianNumber(
                    current
                )}
                /
                ${toPersianNumber(
                    target
                )}
            </p>

            <div
                style="
                    height:10px;
                    background:#eee;
                    border-radius:20px;
                    overflow:hidden;
                    margin:10px 0;
                "
            >

                <div
                    style="
                        width:${percent}%;
                        height:100%;
                        background:#111;
                    "
                ></div>

            </div>

            <button
                class="secondary-btn"
                data-goal-increase="${goal.id}"
            >
                + پیشرفت
            </button>

        </div>
    `;
}


async function createGoal() {

    const title =
        document
            .getElementById(
                "goalTitle"
            )
            .value
            .trim();

    const target_value =
        Number(
            document
                .getElementById(
                    "goalTarget"
                )
                .value
        ) || 0;

    if (!title) {

        alert(
            "عنوان هدف را وارد کنید."
        );

        return;
    }

    try {

        await apiRequest(
            "/api/goals",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        title,
                        goal_type:
                            "number",
                        target_value
                    })
            }
        );

        renderGoalsPage();

    } catch (error) {

        alert(error.message);
    }
}


async function increaseGoal(id) {

    const goal =
        state.goals.find(
            item =>
                item.id === id
        );

    if (!goal) return;

    const current =
        Number(
            goal.current_value ||
            0
        ) + 1;

    try {

        await apiRequest(
            `/api/goals/${id}`,
            {
                method: "PUT",

                body:
                    JSON.stringify({
                        current_value:
                            current
                    })
            }
        );

        renderGoalsPage();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   EXAMS
===================================================== */

async function renderExamsPage() {

    try {

        const result =
            await apiRequest(
                "/api/exams"
            );

        state.exams =
            result.exams || [];

    } catch (error) {

        console.error(error);
    }

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        📚 امتحان‌ها
                    </h1>

                    <p>
                        تاریخ آزمون‌ها و امتحان‌های مهمت را ثبت کن.
                    </p>

                    <div class="field">

                        <input
                            id="examTitle"
                            placeholder="عنوان امتحان"
                        >

                    </div>

                    <div class="field">

                        <input
                            id="examDate"
                            type="date"
                        >

                    </div>

                    <div class="field">

                        <textarea
                            id="examDescription"
                            placeholder="توضیحات"
                        ></textarea>

                    </div>

                    <button
                        class="primary-btn"
                        id="addExam"
                    >
                        افزودن امتحان
                    </button>

                    <div
                        style="margin-top:20px"
                    >

                        ${
                            state.exams.length
                                ? state.exams
                                    .map(
                                        renderExam
                                    )
                                    .join("")
                                : `
                                    <div class="empty-slot">
                                        هنوز امتحانی ثبت نشده.
                                    </div>
                                `
                        }

                    </div>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "addExam"
        )
        ?.addEventListener(
            "click",
            createExam
        );

    document
        .querySelectorAll(
            "[data-delete-exam]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    deleteExam(
                        Number(
                            button.dataset
                                .deleteExam
                        )
                    )
            );

        });
}


function renderExam(exam) {

    return `
        <div class="mini-card">

            <strong>
                ${escapeHtml(
                    exam.title
                )}
            </strong>

            <p>
                📅
                ${formatDate(
                    exam.exam_date
                )}
            </p>

            <p>
                ${escapeHtml(
                    exam.description ||
                    ""
                )}
            </p>

            <button
                class="secondary-btn"
                data-delete-exam="${exam.id}"
            >
                حذف
            </button>

        </div>
    `;
}


async function createExam() {

    const title =
        document
            .getElementById(
                "examTitle"
            )
            .value
            .trim();

    const exam_date =
        document
            .getElementById(
                "examDate"
            )
            .value;

    const description =
        document
            .getElementById(
                "examDescription"
            )
            .value
            .trim();

    if (
        !title ||
        !exam_date
    ) {

        alert(
            "عنوان و تاریخ را وارد کنید."
        );

        return;
    }

    try {

        await apiRequest(
            "/api/exams",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        title,
                        exam_date,
                        description
                    })
            }
        );

        renderExamsPage();

    } catch (error) {

        alert(error.message);
    }
}


async function deleteExam(id) {

    if (
        !confirm(
            "آیا این امتحان حذف شود؟"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/api/exams/${id}`,
            {
                method: "DELETE"
            }
        );

        renderExamsPage();

    } catch (error) {

        alert(error.message);
    }
}


/* =====================================================
   AI PLANNER
===================================================== */

function renderAIPage() {

    app.innerHTML = `
        <div class="app" dir="rtl">

            <header class="header">

                <div class="header-logo">
                    StudyMed
                </div>

                <button
                    class="logout"
                    id="logoutButton"
                >
                    خروج
                </button>

            </header>

            ${renderNavigation()}

            <main>

                <div class="page-card">

                    <h1>
                        🤖 AI Planner
                    </h1>

                    <p>
                        با چند اطلاعات ساده برنامه پیشنهادی بگیر.
                    </p>

                    <div class="field">

                        <label>
                            چند ساعت امروز وقت داری؟
                        </label>

                        <input
                            id="aiHours"
                            type="number"
                            value="8"
                            min="1"
                            max="24"
                        >

                    </div>

                    <div class="field">

                        <label>
                            درس‌ها
                        </label>

                        <textarea
                            id="aiSubjects"
                            placeholder="فیزیولوژی، آناتومی، زبان"
                        ></textarea>

                    </div>

                    <div class="field">

                        <label>
                            اولویت اصلی
                        </label>

                        <input
                            id="aiPriority"
                            placeholder="مثلاً فیزیولوژی"
                        >

                    </div>

                    <button
                        class="primary-btn"
                        id="generateAI"
                    >
                        ✨ ساخت برنامه
                    </button>

                    <div
                        id="aiResult"
                        style="margin-top:20px"
                    ></div>

                </div>

            </main>

        </div>
    `;

    bindNavigation();

    document
        .getElementById(
            "logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "generateAI"
        )
        ?.addEventListener(
            "click",
            generateAIPlan
        );
}


function generateAIPlan() {

    const hours =
        Number(
            document
                .getElementById(
                    "aiHours"
                )
                .value
        ) || 8;

    const subjects =
        document
            .getElementById(
                "aiSubjects"
            )
            .value
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

    const priority =
        document
            .getElementById(
                "aiPriority"
            )
            .value
            .trim();

    const result =
        document.getElementById(
            "aiResult"
        );

    if (!subjects.length) {

        result.innerHTML = `
            <div class="error">
                حداقل یک درس وارد کن.
            </div>
        `;

        return;
    }

    const blocks =
        Math.max(
            1,
            Math.floor(
                hours
            )
        );

    let hour = 8;

    const plan = [];

    for (
        let i = 0;
        i < blocks;
        i++
    ) {

        const subject =
            priority &&
            i === 0
                ? priority
                : subjects[
                    i %
                    subjects.length
                ];

        plan.push(`
            <div class="mini-card">

                <strong>
                    ${toPersianNumber(
                        `${String(
                            hour
                        ).padStart(
                            2,
                            "0"
                        )}:00`
                    )}
                </strong>

                <p>
                    📚 مطالعه
                    ${escapeHtml(
                        subject
                    )}
                    — ۵۰ دقیقه
                </p>

            </div>
        `);

        hour++;

        if (hour === 13) {
            hour = 14;
        }
    }

    result.innerHTML = `
        <h3>
            برنامه پیشنهادی امروز ✨
        </h3>

        ${plan.join("")}
    `;
}


/* =====================================================
   PAGE ROUTER
===================================================== */

async function openPage(page) {

    switch (page) {

        case "home":

            await loadPlannerData();

            renderDashboard();

            break;


        case "planner":

            await loadPlannerData();

            renderDashboard();

            break;


        case "pomodoro":

            renderPomodoroPage();

            break;


        case "reviews":

            await renderReviewsPage();

            break;


        case "habits":

            await renderHabitsPage();

            break;


        case "tests":

            await renderTestsPage();

            break;


        case "goals":

            await renderGoalsPage();

            break;


        case "exams":

            await renderExamsPage();

            break;


        case "ai":

            renderAIPage();

            break;


        default:

            renderDashboard();
    }
}


function renderCurrentPage() {

    if (!state.user) {

        showLogin();

        return;
    }

    openPage(
        state.currentPage
    );
}


/* =====================================================
   STUDY DATA
===================================================== */

async function loadStudySessions() {

    try {

        const result =
            await apiRequest(
                "/api/study-sessions"
            );

        state.sessions =
            result.sessions || [];

    } catch (error) {

        console.error(error);
    }
}


function getTodayStudyMinutes() {

    return state.sessions
        .filter(
            session =>
                session.session_date ===
                today()
        )
        .reduce(
            (
                total,
                session
            ) =>
                total +
                Number(
                    session.duration_minutes ||
                    0
                ),
            0
        );
}


/* =====================================================
   CURRENT USER
===================================================== */

async function loadCurrentUser() {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        showLogin();

        return;
    }

    try {

        const result =
            await apiRequest(
                "/api/me"
            );

        state.user =
            result;

        await loadPlannerData();

        await loadStudySessions();

        renderCurrentPage();

    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "token"
        );

        state.user = null;

        showLogin();
    }
}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

    pausePomodoro();

    localStorage.removeItem(
        "token"
    );

    state.user = null;

    state.tasks = [];
    state.todos = [];
    state.note = "";
    state.reviews = [];
    state.sessions = [];

    showLogin();
}


/* =====================================================
   PLANNER EVENTS
===================================================== */

function bindPlannerEvents() {

    document
        .getElementById(
            "addTaskBtn"
        )
        ?.addEventListener(
            "click",
            showTaskModal
        );


    document
        .getElementById(
            "addTodo"
        )
        ?.addEventListener(
            "click",
            addTodoItem
        );


    document
        .getElementById(
            "todoInput"
        )
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    addTodoItem();
                }

            }
        );


    document
        .querySelectorAll(
            "[data-complete]"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () =>
                        toggleTask(
                            Number(
                                checkbox.dataset
                                    .complete
                            )
                        )
                );

            }
        );


    document
        .querySelectorAll(
            "[data-delete]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteTask(
                            Number(
                                button.dataset
                                    .delete
                            )
                        )
                );

            }
        );


    document
        .querySelectorAll(
            "[data-todo]"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () =>
                        toggleTodo(
                            Number(
                                checkbox.dataset
                                    .todo
                            )
                        )
                );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-todo]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteTodo(
                            Number(
                                button.dataset
                                    .deleteTodo
                            )
                        )
                );

            }
        );


    document
        .getElementById(
            "saveNote"
        )
        ?.addEventListener(
            "click",
            saveDailyNote
        );
}


/* =====================================================
   START
===================================================== */

loadCurrentUser();
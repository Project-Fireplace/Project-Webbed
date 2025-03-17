// --- JavaScript ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => console.log('Service Worker registered! Scope is: ', registration.scope))
            .catch(error => console.log('Service Worker registration failed: ', error));
    });
}

// --- DOM Element References ---
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const offlineSection = document.getElementById('offline-section');
const contentSection = document.getElementById('content'); // Keep for consistency
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const mainMenu = document.getElementById('mainMenu');
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const moreOptionsMenu = document.getElementById('moreOptionsMenu');
const clearAllBtn = document.getElementById('clearAllBtn');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const toggleCompletedBtn = document.getElementById('toggleCompletedBtn');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');

// Filter elements
const priorityFilter = document.getElementById('priorityFilter');
const dueDateFilter = document.getElementById('dueDateFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');

// Settings
const settingsLink = document.querySelector('.settings-link');
const settingsOptions = document.querySelector('.settings-options');
const notificationToggle = document.getElementById('notificationToggle');
const reminderTimeInput = document.getElementById('reminderTime');
const filterLink = document.querySelector('.filter-link'); // Get filter link
const filterOptions = document.querySelector('.filter-options');


// --- Menu Event Listeners ---
menuBtn.addEventListener('click', () => {
    mainMenu.classList.add('open');
});

closeMenuBtn.addEventListener('click', () => {
    mainMenu.classList.remove('open');
});

moreOptionsBtn.addEventListener('click', () => moreOptionsMenu.classList.toggle('open'));

// Settings Toggle
settingsLink.addEventListener('click', (event) => {
    event.preventDefault();
    settingsOptions.classList.toggle('open');
    mainMenu.classList.remove('open'); // Close the drawer
});

//Filter toggle
filterLink.addEventListener('click', (event) => {
    event.preventDefault();
    filterOptions.classList.toggle('open');
     mainMenu.classList.remove('open');
});

// Close menus when clicking outside
document.addEventListener('click', (event) => {
    if (mainMenu.classList.contains('open') && !mainMenu.contains(event.target) && !menuBtn.contains(event.target)) {
        mainMenu.classList.remove('open');
    }
    if (moreOptionsMenu.classList.contains('open') && !moreOptionsMenu.contains(event.target) && !moreOptionsBtn.contains(event.target)) {
        moreOptionsMenu.classList.remove('open');
    }
    if (settingsOptions.classList.contains('open') && !settingsOptions.contains(event.target) && !settingsLink.contains(event.target)) {
        settingsOptions.classList.remove('open');
    }
    // Close filter if open and click is outside
     if (filterOptions.classList.contains('open') && !filterOptions.contains(event.target) && !filterLink.contains(event.target)) {
         filterOptions.classList.remove('open');
    }
});

// --- Load Data (Tasks, Theme, and Settings) ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let showCompleted = true;
let currentTheme = localStorage.getItem('theme') || 'light';
document.body.className = currentTheme;

let notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
let reminderTime = parseInt(localStorage.getItem('reminderTime')) || 30;

notificationToggle.checked = notificationsEnabled;
reminderTimeInput.value = reminderTime;

// --- Task Functions ---

function displayTasks() {
    const priority = priorityFilter.value;
    const dueDate = dueDateFilter.value;

    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        if (!showCompleted && task.completed) return;
        if (priority !== 'all' && task.priority !== priority) return;
        if (dueDate && task.dueDate !== dueDate) return;

        const li = document.createElement('li');
        li.innerHTML = `
            <span class="task-text ${task.completed ? 'completed' : ''} priority-${task.priority}">
                ${task.text}
            </span>
            ${task.dueDate ? `<span class="due-date"> (Due: ${task.dueDate})</span>` : ''}
            <div class="task-actions">
                <button class="editBtn" data-index="${index}" aria-label="Edit Task">Edit</button>
                <button class="deleteBtn" data-index="${index}" aria-label="Delete Task">Delete</button>
            </div>
        `;
        li.addEventListener('click', (event) => {
            if (!event.target.classList.contains('editBtn') && !event.target.classList.contains('deleteBtn')) {
                toggleTaskComplete(index);
            }
        });
        taskList.appendChild(li);
    });

    document.querySelectorAll('.deleteBtn').forEach(button => button.addEventListener('click', deleteTask));
    document.querySelectorAll('.editBtn').forEach(button => button.addEventListener('click', editTask));
}

function addTask() {
    const taskText = taskInput.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;

    if (taskText !== '') {
        const newTask = { text: taskText, completed: false, priority, dueDate };
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        displayTasks();
        taskInput.value = '';
        prioritySelect.value = 'low';
        dueDateInput.value = '';

        if (notificationsEnabled && dueDate) {
            scheduleNotification(newTask);
        }
    }
}

function deleteTask(event) {
    event.stopPropagation();
    const index = event.target.dataset.index;
     cancelNotification(tasks[index]);
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    displayTasks();
}

function toggleTaskComplete(index) {
    tasks[index].completed = !tasks[index].completed;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    displayTasks();
}

function editTask(event) {
    event.stopPropagation();
    const index = event.target.dataset.index;
    const li = event.target.closest('li');
    const taskTextSpan = li.querySelector('.task-text');
    const currentText = tasks[index].text;

    taskTextSpan.innerHTML = `<input type="text" class="edit-input" value="${currentText}" aria-label="Edit task text">`;
    const editInput = li.querySelector('.edit-input');
    editInput.focus();

    function saveEdit() {
        const newText = editInput.value.trim();
        if (newText !== '') {
            tasks[index].text = newText;
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
        displayTasks();
    }

    editInput.addEventListener('blur', saveEdit);
    editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
}

function clearAllTasks() {
     if (confirm("Are you sure you want to clear all tasks?")) {
        tasks = [];
        localStorage.removeItem('tasks');
        displayTasks();
        mainMenu.classList.remove('open'); // Close drawer
    }
}

function importTasks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedTasks = JSON.parse(e.target.result);
                     if (Array.isArray(importedTasks) && importedTasks.every(t => typeof t.text === 'string' && typeof t.completed === 'boolean' && typeof t.priority === 'string' && (t.dueDate === null || typeof t.dueDate === 'string'))) {
                        tasks = importedTasks;
                        localStorage.setItem('tasks', JSON.stringify(tasks));
                        displayTasks();
                        alert('Tasks imported successfully!');
                    } else {
                        alert('Invalid file format. Please import a valid JSON file with text, completed, priority, and dueDate fields.');
                    }
                } catch (error) {
                    alert('Error importing tasks: ' + error.message);
                }
                 

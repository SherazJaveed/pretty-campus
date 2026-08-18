/* ========================================
   PRETTY CAMPUS - Task Sidebar with Progress Rings
   Features: Weekly view, color-coded courses, 
   completion tracking, streaks, confetti,
   sort/filter, custom tasks, deadline countdown
   ======================================== */

(function() {
  'use strict';

  // Wait for DOM
  function init() {
    // Don't double-inject
    if (document.getElementById('pc-task-sidebar')) return;

    // Get mock data or real Canvas data
    var courses = (typeof PrettyGPA !== 'undefined' && PrettyGPA.getMockCourses) 
      ? PrettyGPA.getMockCourses() : [];

    // Build tasks from courses
    var tasks = buildMockTasks(courses);

    // Load saved state
    chrome.storage.local.get(['pcTasks', 'pcStreak', 'pcStreakDate', 'pcCustomTasks', 'pcSortBy', 'pcFilterCourse'], function(data) {
      var savedTasks = data.pcTasks || {};
      var streak = data.pcStreak || 0;
      var streakDate = data.pcStreakDate || '';
      var customTasks = data.pcCustomTasks || [];
      var sortBy = data.pcSortBy || 'date';
      var filterCourse = data.pcFilterCourse || 'all';

      // Merge saved completion status
      tasks.forEach(function(t) {
        if (savedTasks[t.id]) t.completed = savedTasks[t.id].completed;
      });

      // Add custom tasks
      customTasks.forEach(function(ct) {
        tasks.push(ct);
      });

      // Check streak
      var today = new Date().toDateString();
      if (streakDate !== today) {
        var yesterday = new Date(Date.now() - 86400000).toDateString();
        if (streakDate === yesterday) {
          // Continue streak
        } else if (streakDate !== '') {
          streak = 0; // Reset streak
        }
      }

      // Create sidebar
      createSidebar(tasks, courses, streak, sortBy, filterCourse);
    });
  }

  function buildMockTasks(courses) {
    var now = new Date();
    var tasks = [];
    var mockAssignments = [
      { courseIdx: 0, name: 'Lab 5: Binary Search Trees', type: 'assignment', points: 100, dueOffset: 1 },
      { courseIdx: 1, name: 'Problem Set 8: Eigenvalues', type: 'assignment', points: 50, dueOffset: 3 },
      { courseIdx: 2, name: 'Essay Draft: Rhetoric Analysis', type: 'essay', points: 200, dueOffset: 5 },
      { courseIdx: 3, name: 'Quiz 3: Newton\'s Laws', type: 'quiz', points: 30, dueOffset: 6 },
      { courseIdx: 4, name: 'Reading Response Ch. 12', type: 'assignment', points: 25, dueOffset: 2 },
      { courseIdx: 0, name: 'Project 2: Graph Algorithms', type: 'project', points: 300, dueOffset: 10 },
      { courseIdx: 1, name: 'Midterm Review Worksheet', type: 'assignment', points: 0, dueOffset: 4 },
      { courseIdx: 3, name: 'Lab Report: Friction', type: 'lab', points: 50, dueOffset: 7 },
      { courseIdx: 2, name: 'Discussion Post: Week 8', type: 'discussion', points: 20, dueOffset: 1 },
      { courseIdx: 4, name: 'Research Paper Outline', type: 'assignment', points: 75, dueOffset: 8 },
      { courseIdx: 0, name: 'Homework 6: Sorting', type: 'assignment', points: 40, dueOffset: -1, completed: true },
      { courseIdx: 1, name: 'Quiz 4: Matrices', type: 'quiz', points: 20, dueOffset: -2, completed: true }
    ];

    mockAssignments.forEach(function(a, i) {
      var course = courses[a.courseIdx] || { name: 'Course', color: '#7C3AED' };
      var due = new Date(now.getTime() + a.dueOffset * 86400000);
      tasks.push({
        id: 'task-' + i,
        name: a.name,
        courseName: course.name,
        courseTitle: course.title || '',
        courseColor: course.color,
        type: a.type,
        points: a.points,
        dueDate: due,
        completed: a.completed || false,
        isCustom: false
      });
    });

    return tasks;
  }

  function createSidebar(tasks, courses, streak, sortBy, filterCourse) {
    var sidebar = document.createElement('div');
    sidebar.id = 'pc-task-sidebar';

    // Sort tasks
    tasks = sortTasks(tasks, sortBy);

    // Filter tasks
    var filtered = filterCourse === 'all' ? tasks : tasks.filter(function(t) { return t.courseName === filterCourse; });

    // Separate completed and pending
    var pending = filtered.filter(function(t) { return !t.completed; });
    var completed = filtered.filter(function(t) { return t.completed; });

    // Calculate progress per course
    var courseProgress = {};
    courses.forEach(function(c) {
      var courseTasks = tasks.filter(function(t) { return t.courseName === c.name; });
      var done = courseTasks.filter(function(t) { return t.completed; }).length;
      courseProgress[c.name] = { total: courseTasks.length, done: done, color: c.color };
    });

    // Count overdue
    var now = new Date();
    var overdue = pending.filter(function(t) { return t.dueDate < now; });
    var dueToday = pending.filter(function(t) { return t.dueDate.toDateString() === now.toDateString(); });
    var dueWeek = pending.filter(function(t) { return t.dueDate > now && t.dueDate < new Date(now.getTime() + 7 * 86400000); });

    sidebar.innerHTML = buildSidebarHTML(pending, completed, courseProgress, courses, streak, sortBy, filterCourse, overdue, dueToday, dueWeek);

    // Insert into page
    var content = document.getElementById('content') || document.body;
    var existingSidebar = document.getElementById('pc-task-sidebar');
    if (existingSidebar) existingSidebar.remove();

    // Create wrapper if needed
    var wrapper = document.getElementById('pc-task-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'pc-task-wrapper';
      wrapper.style.cssText = 'position:fixed;top:0;right:0;width:320px;height:100vh;z-index:9998;overflow-y:auto;transition:transform 0.3s ease;';
      document.body.appendChild(wrapper);
    }
    wrapper.appendChild(sidebar);

    // Adjust page content
    var mainContent = document.getElementById('content');
    if (mainContent) mainContent.style.marginRight = '340px';

    // Add event listeners
    setupEvents(tasks, courses, streak);
  }

  function buildSidebarHTML(pending, completed, courseProgress, courses, streak, sortBy, filterCourse, overdue, dueToday, dueWeek) {
    // Progress rings HTML
    var ringsHTML = '';
    Object.keys(courseProgress).forEach(function(name) {
      var p = courseProgress[name];
      var pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
      var circumference = 2 * Math.PI * 24;
      var offset = circumference - (pct / 100) * circumference;
      ringsHTML += '<div class="pc-ring-item" title="' + name + ': ' + p.done + '/' + p.total + ' done">' +
        '<svg width="58" height="58" viewBox="0 0 58 58">' +
          '<circle cx="29" cy="29" r="24" fill="none" stroke="#2D2640" stroke-width="5"/>' +
          '<circle cx="29" cy="29" r="24" fill="none" stroke="' + p.color + '" stroke-width="5" ' +
            'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" ' +
            'stroke-linecap="round" transform="rotate(-90 29 29)" style="transition:stroke-dashoffset 0.5s ease;"/>' +
        '</svg>' +
        '<span class="pc-ring-label">' + name + '</span>' +
        '<span class="pc-ring-pct" style="color:' + p.color + '">' + Math.round(pct) + '%</span>' +
      '</div>';
    });

    // Filter options
    var filterHTML = '<option value="all">All Courses</option>';
    courses.forEach(function(c) {
      var sel = filterCourse === c.name ? ' selected' : '';
      filterHTML += '<option value="' + c.name + '"' + sel + '>' + c.name + '</option>';
    });

    // Task items HTML
    var tasksHTML = '';
    pending.forEach(function(t) {
      var timeLeft = getTimeLeft(t.dueDate);
      var urgency = getUrgency(t.dueDate);
      var typeIcon = getTypeIcon(t.type);
      tasksHTML += '<div class="pc-task-item" data-id="' + t.id + '">' +
        '<div class="pc-task-check" data-id="' + t.id + '" style="border-color:' + t.courseColor + '"></div>' +
        '<div class="pc-task-info">' +
          '<div class="pc-task-name">' + typeIcon + ' ' + t.name + '</div>' +
          '<div class="pc-task-meta">' +
            '<span class="pc-task-course" style="color:' + t.courseColor + '">' + t.courseName + '</span>' +
            (t.points > 0 ? '<span class="pc-task-points">' + t.points + ' pts</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="pc-task-due ' + urgency + '">' + timeLeft + '</div>' +
      '</div>';
    });

    if (pending.length === 0) {
      tasksHTML = '<div class="pc-task-empty">All caught up! No pending tasks.</div>';
    }

    // Completed tasks HTML
    var completedHTML = '';
    completed.forEach(function(t) {
      completedHTML += '<div class="pc-task-item pc-task-done" data-id="' + t.id + '">' +
        '<div class="pc-task-check pc-task-checked" data-id="' + t.id + '" style="background:' + t.courseColor + ';border-color:' + t.courseColor + '">&#10003;</div>' +
        '<div class="pc-task-info">' +
          '<div class="pc-task-name pc-task-strikethrough">' + t.name + '</div>' +
          '<div class="pc-task-meta"><span class="pc-task-course" style="color:' + t.courseColor + '">' + t.courseName + '</span></div>' +
        '</div>' +
      '</div>';
    });

    return '<div class="pc-sidebar-inner">' +
      // Header
      '<div class="pc-sidebar-header">' +
        '<div class="pc-sidebar-title">Tasks</div>' +
        '<div class="pc-sidebar-streak" title="Submission streak">&#128293; ' + streak + ' day streak</div>' +
      '</div>' +

      // Progress rings
      '<div class="pc-rings-container">' + ringsHTML + '</div>' +

      // Stats bar
      '<div class="pc-stats-bar">' +
        '<div class="pc-stat pc-stat-overdue">' + overdue.length + ' overdue</div>' +
        '<div class="pc-stat pc-stat-today">' + dueToday.length + ' today</div>' +
        '<div class="pc-stat pc-stat-week">' + dueWeek.length + ' this week</div>' +
      '</div>' +

      // Controls
      '<div class="pc-controls">' +
        '<select class="pc-sort-select" id="pcSortBy">' +
          '<option value="date"' + (sortBy === 'date' ? ' selected' : '') + '>Sort: Due Date</option>' +
          '<option value="course"' + (sortBy === 'course' ? ' selected' : '') + '>Sort: Course</option>' +
          '<option value="points"' + (sortBy === 'points' ? ' selected' : '') + '>Sort: Points</option>' +
          '<option value="type"' + (sortBy === 'type' ? ' selected' : '') + '>Sort: Type</option>' +
        '</select>' +
        '<select class="pc-filter-select" id="pcFilterCourse">' + filterHTML + '</select>' +
      '</div>' +

      // Add custom task button
      '<div class="pc-add-task" id="pcAddTask">+ Add Custom Task</div>' +

      // Add task form (hidden)
      '<div class="pc-add-form" id="pcAddForm" style="display:none;">' +
        '<input type="text" id="pcNewTaskName" class="pc-input" placeholder="Task name...">' +
        '<input type="text" id="pcNewTaskCourse" class="pc-input" placeholder="Course (e.g. CS 301)">' +
        '<input type="date" id="pcNewTaskDate" class="pc-input">' +
        '<div class="pc-add-form-btns">' +
          '<button class="pc-btn-add" id="pcSaveTask">Add Task</button>' +
          '<button class="pc-btn-cancel" id="pcCancelTask">Cancel</button>' +
        '</div>' +
      '</div>' +

      // Pending tasks
      '<div class="pc-task-section-title">Pending (' + pending.length + ')</div>' +
      '<div class="pc-task-list" id="pcPendingList">' + tasksHTML + '</div>' +

      // Completed tasks
      '<div class="pc-task-section-title pc-completed-title" id="pcCompletedToggle">Completed (' + completed.length + ') &#9660;</div>' +
      '<div class="pc-task-list pc-completed-list" id="pcCompletedList" style="display:none;">' + completedHTML + '</div>' +

      // Weekly workload estimate
      '<div class="pc-workload">' +
        '<div class="pc-workload-title">Estimated Workload</div>' +
        '<div class="pc-workload-hours">' + estimateWorkload(pending) + '</div>' +
      '</div>' +

    '</div>';
  }

  function setupEvents(tasks, courses, streak) {
    // Check/uncheck tasks
    document.querySelectorAll('.pc-task-check').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = el.dataset.id;
        var task = tasks.find(function(t) { return t.id === id; });
        if (!task) return;

        task.completed = !task.completed;

        // Save state
        var saved = {};
        tasks.forEach(function(t) { saved[t.id] = { completed: t.completed }; });
        chrome.storage.local.set({ pcTasks: saved });

        // Update streak
        if (task.completed) {
          var today = new Date().toDateString();
          chrome.storage.local.get(['pcStreak', 'pcStreakDate'], function(data) {
            var s = data.pcStreak || 0;
            if (data.pcStreakDate !== today) {
              s = s + 1;
              chrome.storage.local.set({ pcStreak: s, pcStreakDate: today });
            }
            // Check if all today's tasks are done
            var todayTasks = tasks.filter(function(t) { return t.dueDate.toDateString() === today; });
            var allDone = todayTasks.every(function(t) { return t.completed; });
            if (allDone && todayTasks.length > 0) {
              showConfetti();
            }
            // Rebuild sidebar
            createSidebar(tasks, courses, s, document.getElementById('pcSortBy').value, document.getElementById('pcFilterCourse').value);
          });
        } else {
          createSidebar(tasks, courses, streak, document.getElementById('pcSortBy').value, document.getElementById('pcFilterCourse').value);
        }
      });
    });

    // Sort change
    var sortEl = document.getElementById('pcSortBy');
    if (sortEl) {
      sortEl.addEventListener('change', function() {
        chrome.storage.local.set({ pcSortBy: sortEl.value });
        createSidebar(tasks, courses, streak, sortEl.value, document.getElementById('pcFilterCourse').value);
      });
    }

    // Filter change
    var filterEl = document.getElementById('pcFilterCourse');
    if (filterEl) {
      filterEl.addEventListener('change', function() {
        chrome.storage.local.set({ pcFilterCourse: filterEl.value });
        createSidebar(tasks, courses, streak, document.getElementById('pcSortBy').value, filterEl.value);
      });
    }

    // Completed toggle
    var compToggle = document.getElementById('pcCompletedToggle');
    if (compToggle) {
      compToggle.addEventListener('click', function() {
        var list = document.getElementById('pcCompletedList');
        if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Add task button
    var addBtn = document.getElementById('pcAddTask');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        var form = document.getElementById('pcAddForm');
        if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Save custom task
    var saveBtn = document.getElementById('pcSaveTask');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var name = document.getElementById('pcNewTaskName').value;
        var course = document.getElementById('pcNewTaskCourse').value;
        var date = document.getElementById('pcNewTaskDate').value;
        if (!name) return;

        var newTask = {
          id: 'custom-' + Date.now(),
          name: name,
          courseName: course || 'Personal',
          courseColor: '#7C3AED',
          type: 'custom',
          points: 0,
          dueDate: date ? new Date(date) : new Date(),
          completed: false,
          isCustom: true
        };

        tasks.push(newTask);

        // Save custom tasks
        chrome.storage.local.get(['pcCustomTasks'], function(data) {
          var ct = data.pcCustomTasks || [];
          ct.push(newTask);
          chrome.storage.local.set({ pcCustomTasks: ct });
        });

        createSidebar(tasks, courses, streak, document.getElementById('pcSortBy').value, document.getElementById('pcFilterCourse').value);
      });
    }

    // Cancel add task
    var cancelBtn = document.getElementById('pcCancelTask');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('pcAddForm').style.display = 'none';
      });
    }
  }

  // Helper functions
  function sortTasks(tasks, sortBy) {
    return tasks.slice().sort(function(a, b) {
      if (sortBy === 'date') return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortBy === 'course') return a.courseName.localeCompare(b.courseName);
      if (sortBy === 'points') return b.points - a.points;
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return 0;
    });
  }

  function getTimeLeft(due) {
    var now = new Date();
    var diff = due - now;
    if (diff < 0) return 'Overdue';
    var hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Due now';
    if (hours < 24) return hours + 'h left';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'Tomorrow';
    return days + ' days';
  }

  function getUrgency(due) {
    var diff = due - new Date();
    if (diff < 0) return 'pc-overdue';
    if (diff < 86400000) return 'pc-urgent';
    if (diff < 3 * 86400000) return 'pc-soon';
    return 'pc-normal';
  }

  function getTypeIcon(type) {
    var icons = {
      assignment: '&#128221;',
      quiz: '&#10067;',
      essay: '&#9997;',
      project: '&#128187;',
      lab: '&#128300;',
      discussion: '&#128172;',
      custom: '&#11088;'
    };
    return icons[type] || '&#128196;';
  }

  function estimateWorkload(pending) {
    var hours = 0;
    pending.forEach(function(t) {
      if (t.type === 'essay' || t.type === 'project') hours += 3;
      else if (t.type === 'lab') hours += 2;
      else if (t.type === 'quiz') hours += 1;
      else if (t.type === 'discussion') hours += 0.5;
      else hours += 1.5;
    });
    hours = Math.round(hours * 10) / 10;
    return '~' + hours + ' hours this week';
  }

  function showConfetti() {
    var colors = ['#7C3AED', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];
    for (var i = 0; i < 50; i++) {
      var conf = document.createElement('div');
      conf.style.cssText = 'position:fixed;width:8px;height:8px;background:' + colors[i % 5] +
        ';top:-10px;left:' + (Math.random() * 100) + 'vw;z-index:99999;border-radius:50%;' +
        'animation:pcConfetti ' + (1 + Math.random() * 2) + 's ease forwards;';
      document.body.appendChild(conf);
      setTimeout(function() { conf.remove(); }, 3000);
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 600); });
  } else {
    setTimeout(init, 600);
  }

})();

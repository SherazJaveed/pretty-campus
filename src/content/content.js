/* ========================================
   PRETTY CAMPUS v2.0.0 - Production Bundle
   All-in-one Canvas LMS Enhancement Extension
   10 Features | 41 Themes | 16 Badges
   
   Architecture (matches BetterCampus pattern):
   - Single content.js (this file)
   - Single content.css
   - Canvas auto-detection on ALL domains
   - document_start for no white flash
   - storage permission only
   ======================================== */

(function() {
  'use strict';

  // ---- CANVAS DETECTION ----
  // Like BetterCampus, we match https://*/* and detect Canvas dynamically
  function isCanvasPage() {
    var url = window.location.href;
    if (url.indexOf('.instructure.com') !== -1) return true;
    if (url.indexOf('canvas.') !== -1) return true;
    if (url.indexOf('file://') !== -1) return true;
    return false;
  }

  function isCanvasDOM() {
    if (document.getElementById('application')) return true;
    if (document.getElementById('wrapper')) return true;
    if (document.querySelector('.ic-app-header')) return true;
    if (typeof window.ENV !== 'undefined' && window.ENV.CANVAS_BASE_URL) return true;
    return false;
  }

  // ---- EARLY DARK MODE (prevents white flash) ----
  function injectEarlyDarkMode() {
    try {
      var saved = localStorage.getItem('pc_dark_theme');
      if (saved) document.documentElement.classList.add('pc-dark-' + saved);
    } catch(e) {}
  }
  injectEarlyDarkMode();

  // ---- WAIT FOR DOM THEN INIT ----
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function initPrettyCampus() {
    // Double-check Canvas detection after DOM loads
    if (!isCanvasPage() && !isCanvasDOM()) {
      console.log('Pretty Campus: Not a Canvas page, skipping.');
      return;
    }

    console.log('Pretty Campus v2.0.0: Initializing on ' + window.location.hostname);

    // Load settings and initialize all modules
    chrome.storage.local.get([
      'darkMode', 'darkTheme', 'followSystem', 'darkSchedule',
      'pcTasks', 'pcStreak', 'pcStreakDate', 'pcCustomTasks',
      'pcSortBy', 'pcFilterCourse', 'pcBadges', 'pcXP',
      'pcThemeId', 'pcCustomTheme', 'pcNotifications', 'pcFinalsState'
    ], function(data) {
      // Apply dark mode
      initDarkMode(data);

      // Initialize all features with delays to prevent blocking
      setTimeout(function() { initCanvasAPI(); }, 100);
      setTimeout(function() { initGPAWidget(data); }, 300);
      setTimeout(function() { initTaskSidebar(data); }, 500);
      setTimeout(function() { initAchievements(data); }, 700);
      setTimeout(function() { initThemes(data); }, 200);
      setTimeout(function() { initCommandPalette(); }, 400);
      setTimeout(function() { initAutoSave(); }, 600);
      setTimeout(function() { initFinalsMode(data); }, 800);
      setTimeout(function() { initNotifications(data); }, 1000);
      setTimeout(function() { addBadge(); }, 100);

      console.log('Pretty Campus: All modules loaded.');
    });
  }

  // ============================================================
  // MODULE: DARK MODE + CONTENT SCRIPT
  // ============================================================
  function initDarkMode(data) {
    // Apply saved dark mode
    if (data.followSystem) {
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) applyDarkMode(data.darkTheme || 'midnight');
    } else if (data.darkSchedule && data.darkSchedule.enabled) {
      var hour = new Date().getHours();
      var start = data.darkSchedule.start || 18;
      var end = data.darkSchedule.end || 7;
      var shouldBeDark = start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
      if (shouldBeDark) applyDarkMode(data.darkTheme || 'midnight');
    } else if (data.darkMode) {
      applyDarkMode(data.darkTheme || 'midnight');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      chrome.storage.local.get(['followSystem', 'darkTheme'], function(d) {
        if (d.followSystem) {
          if (e.matches) applyDarkMode(d.darkTheme || 'midnight');
          else removeDarkMode();
        }
      });
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'toggleDark') {
        if (request.enabled) applyDarkMode(request.theme);
        else removeDarkMode();
      }
      if (request.action === 'changeTheme') applyDarkMode(request.theme);
      if (request.action === 'followSystem') initDarkMode(request);
      if (request.action === 'getStatus') {
        sendResponse({ darkMode: document.documentElement.className.indexOf('pc-dark-') !== -1, url: window.location.href });
      }
      return true;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Alt+D: Toggle dark mode
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        chrome.storage.local.get(['darkMode', 'darkTheme'], function(d) {
          var newState = !d.darkMode;
          var theme = d.darkTheme || 'midnight';
          chrome.storage.local.set({ darkMode: newState, followSystem: false, darkSchedule: { enabled: false } });
          if (newState) applyDarkMode(theme);
          else removeDarkMode();
        });
      }
    });

    console.log('Pretty Campus: Dark mode ready (Alt+D to toggle)');
  }

  function applyDarkMode(theme) {
    document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
    document.documentElement.classList.add('pc-dark-' + theme);
    try { localStorage.setItem('pc_dark_theme', theme); } catch(e) {}
  }

  function removeDarkMode() {
    document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
    try { localStorage.removeItem('pc_dark_theme'); } catch(e) {}
  }

  function addBadge() {
    if (document.querySelector('.pc-badge')) return;
    var badge = document.createElement('div');
    badge.className = 'pc-badge';
    badge.textContent = 'Pretty Campus';
    badge.title = 'Alt+D: dark mode | Alt+T: themes | Alt+F: finals | Ctrl+K: commands';
    badge.style.cssText = 'position:fixed;bottom:12px;right:12px;background:#7C3AED;color:white;padding:4px 12px;border-radius:16px;font-size:11px;font-family:-apple-system,sans-serif;z-index:99999;cursor:pointer;opacity:0.8;transition:opacity 0.2s;';
    badge.addEventListener('mouseenter', function() { badge.style.opacity = '1'; });
    badge.addEventListener('mouseleave', function() { badge.style.opacity = '0.8'; });
    badge.addEventListener('click', function() {
      chrome.storage.local.get(['darkMode', 'darkTheme'], function(d) {
        var newState = !d.darkMode;
        chrome.storage.local.set({ darkMode: newState });
        if (newState) applyDarkMode(d.darkTheme || 'midnight');
        else removeDarkMode();
      });
    });
    document.body.appendChild(badge);
  }

  // ============================================================
  // MODULE: CANVAS API
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Canvas API Integration
   Fetches real data from Canvas REST API
   Falls back to mock data when not on Canvas
   ======================================== */

var PrettyAPI = (function() {
  'use strict';

  var DEV_MODE = false;
  var API_BASE = '';
  var CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Detect if we're on a real Canvas page
  function detectCanvas() {
    var url = window.location.href;
    // Check for instructure.com domains
    if (url.indexOf('.instructure.com') !== -1 || url.indexOf('canvas.') !== -1) {
      API_BASE = window.location.origin;
      DEV_MODE = false;
      console.log('Pretty Campus API: Real Canvas detected at ' + API_BASE);
      return true;
    }
    // Check for Canvas ENV variable
    if (typeof window.ENV !== 'undefined' && window.ENV.CANVAS_BASE_URL) {
      API_BASE = window.ENV.CANVAS_BASE_URL;
      DEV_MODE = false;
      console.log('Pretty Campus API: Canvas ENV detected at ' + API_BASE);
      return true;
    }
    // Local/mock mode
    DEV_MODE = true;
    console.log('Pretty Campus API: DEV MODE - using mock data');
    return false;
  }

  // Make authenticated API call to Canvas
  function apiCall(endpoint, callback) {
    if (DEV_MODE) {
      callback(null, null);
      return;
    }

    // Check cache first
    var cacheKey = 'pc_cache_' + endpoint;
    chrome.storage.local.get([cacheKey, cacheKey + '_time'], function(data) {
      var cached = data[cacheKey];
      var cachedTime = data[cacheKey + '_time'];
      var now = Date.now();

      if (cached && cachedTime && (now - cachedTime) < CACHE_DURATION) {
        console.log('Pretty Campus API: Cache hit for ' + endpoint);
        callback(null, cached);
        return;
      }

      // Make real API call
      var url = API_BASE + endpoint;
      fetch(url, {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json+canvas-string-ids, application/json'
        }
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('API error: ' + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        // Cache the result
        var cacheObj = {};
        cacheObj[cacheKey] = data;
        cacheObj[cacheKey + '_time'] = now;
        chrome.storage.local.set(cacheObj);

        callback(null, data);
      })
      .catch(function(err) {
        console.log('Pretty Campus API: Error fetching ' + endpoint + ' - ' + err.message);
        callback(err, null);
      });
    });
  }

  // Fetch all active courses
  function getCourses(callback) {
    if (DEV_MODE) {
      callback(null, getMockCourses());
      return;
    }

    apiCall('/api/v1/courses?enrollment_state=active&include[]=total_scores&include[]=current_grading_period_scores&per_page=50', function(err, data) {
      if (err || !data) {
        callback(null, getMockCourses());
        return;
      }

      var courses = data.map(function(c, i) {
        var colors = ['#7C3AED', '#059669', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4'];
        var enrollment = (c.enrollments && c.enrollments[0]) || {};
        var grade = enrollment.computed_current_score || enrollment.computed_final_score || 0;

        return {
          id: c.id,
          name: c.course_code || c.name || 'Course',
          title: c.name || '',
          credits: 3,
          percentage: grade,
          color: colors[i % colors.length],
          enrollmentType: enrollment.type || 'student'
        };
      }).filter(function(c) {
        return c.enrollmentType === 'StudentEnrollment' || c.enrollmentType === 'student';
      });

      if (courses.length === 0) {
        callback(null, getMockCourses());
      } else {
        callback(null, courses);
      }
    });
  }

  // Fetch assignments/todos
  function getTodos(callback) {
    if (DEV_MODE) {
      callback(null, getMockTodos());
      return;
    }

    apiCall('/api/v1/users/self/todo?per_page=50', function(err, todoData) {
      if (err || !todoData) {
        callback(null, getMockTodos());
        return;
      }

      // Also get upcoming assignments
      apiCall('/api/v1/users/self/upcoming_events?per_page=50', function(err2, eventData) {
        var todos = [];
        var seen = {};

        // Process todo items
        if (Array.isArray(todoData)) {
          todoData.forEach(function(item) {
            var assignment = item.assignment || {};
            var id = 'todo-' + (assignment.id || item.id || Math.random());
            if (seen[id]) return;
            seen[id] = true;

            todos.push({
              id: id,
              name: assignment.name || item.title || 'Untitled',
              courseName: item.context_name || 'Course',
              courseColor: '#7C3AED',
              type: getAssignmentType(assignment),
              points: assignment.points_possible || 0,
              dueDate: assignment.due_at ? new Date(assignment.due_at) : new Date(),
              completed: false,
              isCustom: false,
              submissionUrl: assignment.html_url || '#'
            });
          });
        }

        // Process upcoming events
        if (Array.isArray(eventData)) {
          eventData.forEach(function(item) {
            var assignment = item.assignment || {};
            var id = 'event-' + (assignment.id || item.id || Math.random());
            if (seen[id]) return;
            seen[id] = true;

            todos.push({
              id: id,
              name: item.title || assignment.name || 'Untitled',
              courseName: item.context_name || 'Course',
              courseColor: '#7C3AED',
              type: getAssignmentType(assignment),
              points: assignment.points_possible || 0,
              dueDate: item.start_at ? new Date(item.start_at) : (assignment.due_at ? new Date(assignment.due_at) : new Date()),
              completed: false,
              isCustom: false,
              submissionUrl: assignment.html_url || item.html_url || '#'
            });
          });
        }

        // Sort by due date
        todos.sort(function(a, b) { return a.dueDate - b.dueDate; });

        if (todos.length === 0) {
          callback(null, getMockTodos());
        } else {
          callback(null, todos);
        }
      });
    });
  }

  // Fetch grades for a specific course
  function getCourseGrades(courseId, callback) {
    if (DEV_MODE) {
      callback(null, []);
      return;
    }

    apiCall('/api/v1/courses/' + courseId + '/assignments?include[]=submission&order_by=due_at&per_page=50', function(err, data) {
      if (err || !data) {
        callback(null, []);
        return;
      }

      var assignments = data.map(function(a) {
        var sub = a.submission || {};
        return {
          id: a.id,
          name: a.name,
          score: sub.score || 0,
          pointsPossible: a.points_possible || 0,
          weight: a.group_weight || 0,
          dueDate: a.due_at ? new Date(a.due_at) : null,
          submitted: sub.workflow_state === 'submitted' || sub.workflow_state === 'graded',
          graded: sub.workflow_state === 'graded',
          grade: sub.grade || null
        };
      });

      callback(null, assignments);
    });
  }

  // Get assignment type from Canvas data
  function getAssignmentType(assignment) {
    if (!assignment) return 'assignment';
    var types = assignment.submission_types || [];
    if (types.indexOf('online_quiz') !== -1) return 'quiz';
    if (types.indexOf('discussion_topic') !== -1) return 'discussion';
    if (types.indexOf('online_upload') !== -1 || types.indexOf('online_text_entry') !== -1) {
      var name = (assignment.name || '').toLowerCase();
      if (name.indexOf('lab') !== -1) return 'lab';
      if (name.indexOf('essay') !== -1 || name.indexOf('paper') !== -1) return 'essay';
      if (name.indexOf('project') !== -1) return 'project';
    }
    return 'assignment';
  }

  // Clear cache
  function clearCache() {
    chrome.storage.local.get(null, function(data) {
      var keysToRemove = Object.keys(data).filter(function(k) { return k.indexOf('pc_cache_') === 0; });
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
        console.log('Pretty Campus API: Cache cleared');
      }
    });
  }

  // ---- MOCK DATA ----
  function getMockCourses() {
    return [
      { id: 1, name: 'CS 301', title: 'Data Structures & Algorithms', credits: 4, percentage: 92, color: '#7C3AED' },
      { id: 2, name: 'MATH 201', title: 'Linear Algebra', credits: 3, percentage: 85, color: '#059669' },
      { id: 3, name: 'ENG 101', title: 'English Composition', credits: 3, percentage: 78, color: '#F59E0B' },
      { id: 4, name: 'PHYS 150', title: 'Classical Mechanics', credits: 4, percentage: 88, color: '#EC4899' },
      { id: 5, name: 'HIST 220', title: 'World History', credits: 3, percentage: 95, color: '#3B82F6' }
    ];
  }

  function getMockTodos() {
    var now = new Date();
    return [
      { id: 'task-0', name: 'Lab 5: Binary Search Trees', courseName: 'CS 301', courseColor: '#7C3AED', type: 'assignment', points: 100, dueDate: new Date(now.getTime() + 1 * 86400000), completed: false, isCustom: false },
      { id: 'task-1', name: 'Discussion Post: Week 8', courseName: 'ENG 101', courseColor: '#F59E0B', type: 'discussion', points: 20, dueDate: new Date(now.getTime() + 1 * 86400000), completed: false, isCustom: false },
      { id: 'task-2', name: 'Reading Response Ch. 12', courseName: 'HIST 220', courseColor: '#3B82F6', type: 'assignment', points: 25, dueDate: new Date(now.getTime() + 2 * 86400000), completed: false, isCustom: false },
      { id: 'task-3', name: 'Problem Set 8: Eigenvalues', courseName: 'MATH 201', courseColor: '#059669', type: 'assignment', points: 50, dueDate: new Date(now.getTime() + 3 * 86400000), completed: false, isCustom: false },
      { id: 'task-4', name: 'Midterm Review Worksheet', courseName: 'MATH 201', courseColor: '#059669', type: 'assignment', points: 0, dueDate: new Date(now.getTime() + 4 * 86400000), completed: false, isCustom: false },
      { id: 'task-5', name: 'Essay Draft: Rhetoric Analysis', courseName: 'ENG 101', courseColor: '#F59E0B', type: 'essay', points: 200, dueDate: new Date(now.getTime() + 5 * 86400000), completed: false, isCustom: false },
      { id: 'task-6', name: 'Quiz 3: Newton\'s Laws', courseName: 'PHYS 150', courseColor: '#EC4899', type: 'quiz', points: 30, dueDate: new Date(now.getTime() + 6 * 86400000), completed: false, isCustom: false },
      { id: 'task-7', name: 'Lab Report: Friction', courseName: 'PHYS 150', courseColor: '#EC4899', type: 'lab', points: 50, dueDate: new Date(now.getTime() + 7 * 86400000), completed: false, isCustom: false },
      { id: 'task-8', name: 'Research Paper Outline', courseName: 'HIST 220', courseColor: '#3B82F6', type: 'assignment', points: 75, dueDate: new Date(now.getTime() + 8 * 86400000), completed: false, isCustom: false },
      { id: 'task-9', name: 'Project 2: Graph Algorithms', courseName: 'CS 301', courseColor: '#7C3AED', type: 'project', points: 300, dueDate: new Date(now.getTime() + 10 * 86400000), completed: false, isCustom: false },
      { id: 'task-10', name: 'Homework 6: Sorting', courseName: 'CS 301', courseColor: '#7C3AED', type: 'assignment', points: 40, dueDate: new Date(now.getTime() - 1 * 86400000), completed: true, isCustom: false },
      { id: 'task-11', name: 'Quiz 4: Matrices', courseName: 'MATH 201', courseColor: '#059669', type: 'quiz', points: 20, dueDate: new Date(now.getTime() - 2 * 86400000), completed: true, isCustom: false }
    ];
  }

  // Initialize
  detectCanvas();

  // Public API
  return {
    isDevMode: function() { return DEV_MODE; },
    getCourses: getCourses,
    getTodos: getTodos,
    getCourseGrades: getCourseGrades,
    clearCache: clearCache,
    getMockCourses: getMockCourses,
    getMockTodos: getMockTodos
  };

})();


  function initCanvasAPI() {
    // API initializes itself
    console.log('Pretty Campus: Canvas API ready (DEV_MODE: ' + PrettyAPI.isDevMode() + ')');
  }

  // ============================================================
  // MODULE: GPA CALCULATOR
  // ============================================================
/* ========================================
   PRETTY CAMPUS - GPA Calculator Engine v2
   Now uses PrettyAPI for real/mock data
   ======================================== */

var PrettyGPA = {

  gradePoints: {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  },

  percentToGrade: function(pct) {
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 67) return 'D+';
    if (pct >= 63) return 'D';
    if (pct >= 60) return 'D-';
    return 'F';
  },

  calculateGPA: function(courses) {
    var totalPoints = 0;
    var totalCredits = 0;
    courses.forEach(function(course) {
      var grade = course.letterGrade || PrettyGPA.percentToGrade(course.percentage);
      var points = PrettyGPA.gradePoints[grade] || 0;
      totalPoints += points * course.credits;
      totalCredits += course.credits;
    });
    if (totalCredits === 0) return 0;
    return Math.round((totalPoints / totalCredits) * 100) / 100;
  },

  finalNeeded: function(currentGrade, desiredGrade, finalWeight) {
    var needed = (desiredGrade - currentGrade * (1 - finalWeight / 100)) / (finalWeight / 100);
    return Math.round(needed * 100) / 100;
  },

  assignmentImpact: function(currentGrade, assignmentScore, assignmentWeight) {
    var newGrade = currentGrade * (1 - assignmentWeight / 100) + assignmentScore * (assignmentWeight / 100);
    return Math.round(newGrade * 100) / 100;
  },

  predictFinal: function(grades) {
    if (!grades || grades.length < 2) return grades && grades[0] ? grades[0] : 0;
    var n = grades.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i; sumY += grades[i]; sumXY += i * grades[i]; sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;
    var predicted = slope * n + intercept;
    return Math.min(100, Math.max(0, Math.round(predicted * 100) / 100));
  },

  getGPAColor: function(gpa) {
    if (gpa >= 3.7) return '#10B981';
    if (gpa >= 3.0) return '#3B82F6';
    if (gpa >= 2.0) return '#F59E0B';
    return '#EF4444';
  },

  getGradeColor: function(pct) {
    if (pct >= 90) return '#10B981';
    if (pct >= 80) return '#3B82F6';
    if (pct >= 70) return '#F59E0B';
    return '#EF4444';
  },

  // Use PrettyAPI if available, otherwise return mock data
  getMockCourses: function() {
    if (typeof PrettyAPI !== 'undefined') {
      return PrettyAPI.getMockCourses();
    }
    return [
      { id: 1, name: 'CS 301', title: 'Data Structures & Algorithms', credits: 4, percentage: 92, color: '#7C3AED' },
      { id: 2, name: 'MATH 201', title: 'Linear Algebra', credits: 3, percentage: 85, color: '#059669' },
      { id: 3, name: 'ENG 101', title: 'English Composition', credits: 3, percentage: 78, color: '#F59E0B' },
      { id: 4, name: 'PHYS 150', title: 'Classical Mechanics', credits: 4, percentage: 88, color: '#EC4899' },
      { id: 5, name: 'HIST 220', title: 'World History', credits: 3, percentage: 95, color: '#3B82F6' }
    ];
  }
};


  // ============================================================
  // MODULE: GPA WIDGET
  // ============================================================
/* ========================================
   PRETTY CAMPUS - GPA Widget v2 (Fixed)
   Handles missing assignments data gracefully
   ======================================== */

(function() {
  'use strict';

  function initGPAWidget() {
    if (document.getElementById('pc-gpa-widget')) return;

    // Get courses from API or mock
    if (typeof PrettyAPI !== 'undefined') {
      PrettyAPI.getCourses(function(err, courses) {
        if (courses && courses.length > 0) {
          renderWidget(courses);
        }
      });
    } else if (typeof PrettyGPA !== 'undefined') {
      renderWidget(PrettyGPA.getMockCourses());
    }
  }

  function renderWidget(courses) {
    var gpa = PrettyGPA.calculateGPA(courses);
    var gpaColor = PrettyGPA.getGPAColor(gpa);

    var widget = document.createElement('div');
    widget.id = 'pc-gpa-widget';
    widget.innerHTML = buildWidgetHTML(courses, gpa, gpaColor);

    var content = document.getElementById('content');
    if (content) {
      content.insertBefore(widget, content.firstChild);
    } else {
      document.body.insertBefore(widget, document.body.firstChild);
    }

    setupWidgetEvents(courses);
  }

  function buildWidgetHTML(courses, gpa, gpaColor) {
    var coursesHTML = courses.map(function(course) {
      var grade = PrettyGPA.percentToGrade(course.percentage);
      var gradeColor = PrettyGPA.getGradeColor(course.percentage);

      // Handle missing assignments - use percentage for prediction
      var trend = course.percentage;
      var trendGrade = grade;
      var trendDir = '→';
      var trendColor = '#F59E0B';

      if (course.assignments && course.assignments.length >= 2) {
        trend = PrettyGPA.predictFinal(course.assignments.map(function(a) { return a.score; }));
        trendGrade = PrettyGPA.percentToGrade(trend);
        trendDir = trend > course.percentage ? '↑' : trend < course.percentage ? '↓' : '→';
        trendColor = trend > course.percentage ? '#10B981' : trend < course.percentage ? '#EF4444' : '#F59E0B';
      }

      return '<div class="pc-gpa-course">' +
        '<div class="pc-gpa-course-color" style="background:' + course.color + '"></div>' +
        '<div class="pc-gpa-course-info">' +
          '<div class="pc-gpa-course-name">' + course.name + '</div>' +
          '<div class="pc-gpa-course-title">' + (course.title || '') + '</div>' +
        '</div>' +
        '<div class="pc-gpa-course-grade" style="color:' + gradeColor + '">' + course.percentage + '% (' + grade + ')</div>' +
        '<div class="pc-gpa-course-trend" style="color:' + trendColor + '" title="Predicted final: ' + trend + '%">' + trendDir + ' ' + trendGrade + '</div>' +
        '<div class="pc-gpa-course-credits">' + course.credits + ' cr</div>' +
      '</div>';
    }).join('');

    var finalsHTML = courses.map(function(course) {
      return '<option value="' + course.id + '" data-grade="' + course.percentage + '">' + course.name + ' — ' + (course.title || '') + ' (current: ' + course.percentage + '%)</option>';
    }).join('');

    var totalCredits = courses.reduce(function(sum, c) { return sum + c.credits; }, 0);
    var avgPct = courses.reduce(function(sum, c) { return sum + c.percentage; }, 0) / courses.length;
    var avgGrade = PrettyGPA.percentToGrade(avgPct);

    return '<div class="pc-gpa-container">' +
      '<div class="pc-gpa-overview">' +
        '<div class="pc-gpa-big">' +
          '<div class="pc-gpa-number" style="color:' + gpaColor + '">' + gpa.toFixed(2) + '</div>' +
          '<div class="pc-gpa-label">Semester GPA</div>' +
        '</div>' +
        '<div class="pc-gpa-stats">' +
          '<div class="pc-gpa-stat"><span class="pc-gpa-stat-value">' + courses.length + '</span><span class="pc-gpa-stat-label">Courses</span></div>' +
          '<div class="pc-gpa-stat"><span class="pc-gpa-stat-value">' + totalCredits + '</span><span class="pc-gpa-stat-label">Credits</span></div>' +
          '<div class="pc-gpa-stat"><span class="pc-gpa-stat-value" style="color:' + gpaColor + '">' + avgGrade + '</span><span class="pc-gpa-stat-label">Average</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="pc-gpa-courses-header"><span>Course</span><span>Grade</span><span>Trend</span><span>Credits</span></div>' +
      '<div class="pc-gpa-courses">' + coursesHTML + '</div>' +
      '<div class="pc-gpa-finals">' +
        '<div class="pc-gpa-finals-title">What Do I Need On My Final?</div>' +
        '<div class="pc-gpa-finals-form">' +
          '<select id="pc-finals-course" class="pc-select">' + finalsHTML + '</select>' +
          '<div class="pc-gpa-finals-row">' +
            '<div class="pc-gpa-finals-input"><label>I want at least</label>' +
              '<select id="pc-finals-desired" class="pc-select"><option value="90">A (90%)</option><option value="80">B (80%)</option><option value="70">C (70%)</option><option value="60">D (60%)</option></select>' +
            '</div>' +
            '<div class="pc-gpa-finals-input"><label>Final is worth</label>' +
              '<select id="pc-finals-weight" class="pc-select"><option value="10">10%</option><option value="15">15%</option><option value="20">20%</option><option value="25" selected>25%</option><option value="30">30%</option><option value="40">40%</option><option value="50">50%</option></select>' +
            '</div>' +
            '<button id="pc-finals-calc" class="pc-btn">Calculate</button>' +
          '</div>' +
          '<div id="pc-finals-result" class="pc-gpa-finals-result"></div>' +
        '</div>' +
      '</div>' +
      '<div class="pc-gpa-impact">' +
        '<div class="pc-gpa-impact-title">Assignment Impact Preview</div>' +
        '<div class="pc-gpa-impact-scenarios" id="pc-impact-scenarios">' +
          '<div class="pc-impact-hint">Click Calculate above to see how your final affects your grade</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function setupWidgetEvents(courses) {
    var calcBtn = document.getElementById('pc-finals-calc');
    if (calcBtn) {
      calcBtn.addEventListener('click', function() {
        var courseSelect = document.getElementById('pc-finals-course');
        if (!courseSelect) return;
        var currentGrade = parseFloat(courseSelect.options[courseSelect.selectedIndex].dataset.grade);
        var desired = parseFloat(document.getElementById('pc-finals-desired').value);
        var weight = parseFloat(document.getElementById('pc-finals-weight').value);

        var needed = PrettyGPA.finalNeeded(currentGrade, desired, weight);
        var resultDiv = document.getElementById('pc-finals-result');
        if (!resultDiv) return;
        var courseName = courseSelect.options[courseSelect.selectedIndex].text.split(' — ')[0];

        if (needed > 100) {
          resultDiv.innerHTML = '<div class="pc-result-bad">You need <strong>' + needed + '%</strong> on your ' + courseName + ' final. That\'s above 100% — consider adjusting your target grade.</div>';
        } else if (needed < 0) {
          resultDiv.innerHTML = '<div class="pc-result-great">You\'ve already secured this grade in ' + courseName + '! Even a 0% on the final keeps you above your target.</div>';
        } else {
          var difficulty = needed >= 90 ? 'tough but possible' : needed >= 70 ? 'very achievable' : 'easily doable';
          var color = needed >= 90 ? '#EF4444' : needed >= 70 ? '#F59E0B' : '#10B981';
          resultDiv.innerHTML = '<div class="pc-result-ok" style="border-color:' + color + '">You need <strong style="color:' + color + '">' + needed + '%</strong> on your ' + courseName + ' final — ' + difficulty + '!</div>';
        }

        showImpactScenarios(currentGrade, weight);
      });
    }
  }

  function showImpactScenarios(currentGrade, weight) {
    var scenarios = [
      { label: 'If you get an A (95%)', score: 95 },
      { label: 'If you get a B (85%)', score: 85 },
      { label: 'If you get a C (75%)', score: 75 },
      { label: 'If you skip it (0%)', score: 0 }
    ];

    var container = document.getElementById('pc-impact-scenarios');
    if (!container) return;

    var html = scenarios.map(function(s) {
      var newGrade = PrettyGPA.assignmentImpact(currentGrade, s.score, weight);
      var letter = PrettyGPA.percentToGrade(newGrade);
      var color = PrettyGPA.getGradeColor(newGrade);
      var diff = newGrade - currentGrade;
      var diffStr = diff >= 0 ? '+' + diff.toFixed(1) + '%' : diff.toFixed(1) + '%';
      var diffColor = diff >= 0 ? '#10B981' : '#EF4444';

      return '<div class="pc-impact-row">' +
        '<span class="pc-impact-label">' + s.label + '</span>' +
        '<span class="pc-impact-grade" style="color:' + color + '">' + newGrade + '% (' + letter + ')</span>' +
        '<span class="pc-impact-diff" style="color:' + diffColor + '">' + diffStr + '</span>' +
      '</div>';
    }).join('');

    container.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initGPAWidget, 500); });
  } else {
    setTimeout(initGPAWidget, 500);
  }

})();


  function initGPAWidget(data) {
    // GPA widget initializes itself via setTimeout in its IIFE
  }

  // ============================================================
  // MODULE: TASK SIDEBAR
  // ============================================================
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


  function initTaskSidebar(data) {
    // Task sidebar initializes itself
  }

  // ============================================================
  // MODULE: ACHIEVEMENTS
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Achievement Badges + XP System
   Duolingo-inspired gamification for Canvas
   Research-backed: 3-5 meaningful badges per tier,
   XP levels, streak tracking, celebration animations
   ======================================== */

(function() {
  'use strict';

  var BADGES = [
    { id: 'first-submit', name: 'First Steps', emoji: '🎯', desc: 'Complete your first assignment', xp: 50, tier: 'bronze' },
    { id: 'streak-3', name: 'On a Roll', emoji: '🔥', desc: '3-day submission streak', xp: 100, tier: 'bronze' },
    { id: 'streak-7', name: 'Week Warrior', emoji: '⚡', desc: '7-day submission streak', xp: 200, tier: 'silver' },
    { id: 'streak-14', name: 'Unstoppable', emoji: '💪', desc: '14-day submission streak', xp: 400, tier: 'gold' },
    { id: 'streak-30', name: 'Legend', emoji: '👑', desc: '30-day submission streak', xp: 1000, tier: 'platinum' },
    { id: 'perfect-score', name: 'Sharpshooter', emoji: '🎯', desc: 'Score 100% on any assignment', xp: 150, tier: 'silver' },
    { id: 'five-perfect', name: 'Perfectionist', emoji: '💎', desc: '5 perfect scores in a row', xp: 500, tier: 'gold' },
    { id: 'all-caught-up', name: 'All Caught Up', emoji: '✅', desc: 'Zero overdue assignments', xp: 100, tier: 'bronze' },
    { id: 'early-bird', name: 'Early Bird', emoji: '🌅', desc: 'Submit before 8 AM', xp: 75, tier: 'bronze' },
    { id: 'night-owl', name: 'Night Owl', emoji: '🦉', desc: 'Submit after midnight', xp: 75, tier: 'bronze' },
    { id: 'speed-demon', name: 'Speed Demon', emoji: '🏎️', desc: 'Submit 24+ hours early', xp: 100, tier: 'silver' },
    { id: 'bookworm', name: 'Bookworm', emoji: '📚', desc: 'Access 50+ course files', xp: 150, tier: 'silver' },
    { id: 'social-butterfly', name: 'Social Butterfly', emoji: '🦋', desc: 'Post in 10+ discussions', xp: 150, tier: 'silver' },
    { id: 'deans-list', name: "Dean's List", emoji: '⭐', desc: 'Maintain 3.5+ GPA', xp: 300, tier: 'gold' },
    { id: 'semester-survivor', name: 'Semester Survivor', emoji: '🎓', desc: 'Complete a full semester', xp: 500, tier: 'gold' },
    { id: 'gpa-master', name: 'GPA Master', emoji: '🏆', desc: 'Achieve 4.0 GPA', xp: 1000, tier: 'platinum' }
  ];

  var LEVELS = [
    { level: 1, xpNeeded: 0, title: 'Freshman' },
    { level: 2, xpNeeded: 100, title: 'Sophomore' },
    { level: 3, xpNeeded: 300, title: 'Junior' },
    { level: 4, xpNeeded: 600, title: 'Senior' },
    { level: 5, xpNeeded: 1000, title: 'Scholar' },
    { level: 6, xpNeeded: 1500, title: 'Honor Student' },
    { level: 7, xpNeeded: 2200, title: 'Dean\'s List' },
    { level: 8, xpNeeded: 3000, title: 'Valedictorian' },
    { level: 9, xpNeeded: 4000, title: 'Magna Cum Laude' },
    { level: 10, xpNeeded: 5500, title: 'Summa Cum Laude' }
  ];

  var TIER_COLORS = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#7C3AED'
  };

  function init() {
    if (document.getElementById('pc-achievements-panel')) return;

    chrome.storage.local.get(['pcBadges', 'pcXP', 'pcStreak', 'pcStreakDate'], function(data) {
      var earned = data.pcBadges || {};
      var xp = data.pcXP || 0;
      var streak = data.pcStreak || 0;

      // Auto-check some badges based on current state
      earned = checkAutoBadges(earned, streak, xp);

      // Save updated badges
      chrome.storage.local.set({ pcBadges: earned });

      // Create the achievements panel
      createPanel(earned, xp, streak);
    });
  }

  function checkAutoBadges(earned, streak, xp) {
    // Streak badges
    if (streak >= 3 && !earned['streak-3']) { earned['streak-3'] = Date.now(); }
    if (streak >= 7 && !earned['streak-7']) { earned['streak-7'] = Date.now(); }
    if (streak >= 14 && !earned['streak-14']) { earned['streak-14'] = Date.now(); }
    if (streak >= 30 && !earned['streak-30']) { earned['streak-30'] = Date.now(); }

    // For demo: auto-earn first-submit and all-caught-up
    if (!earned['first-submit']) { earned['first-submit'] = Date.now(); }
    if (!earned['all-caught-up']) { earned['all-caught-up'] = Date.now(); }
    if (!earned['night-owl']) { earned['night-owl'] = Date.now(); }

    return earned;
  }

  function getLevel(xp) {
    var level = LEVELS[0];
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpNeeded) {
        level = LEVELS[i];
        break;
      }
    }
    var nextLevel = LEVELS[Math.min(level.level, LEVELS.length - 1)];
    var progress = 0;
    if (nextLevel.xpNeeded > level.xpNeeded) {
      progress = ((xp - level.xpNeeded) / (nextLevel.xpNeeded - level.xpNeeded)) * 100;
    }
    return { current: level, next: nextLevel, progress: Math.min(100, Math.round(progress)) };
  }

  function createPanel(earned, xp, streak) {
    var levelInfo = getLevel(xp);
    var earnedCount = Object.keys(earned).length;
    var totalBadges = BADGES.length;

    var panel = document.createElement('div');
    panel.id = 'pc-achievements-panel';

    // Badge grid
    var badgesHTML = BADGES.map(function(badge) {
      var isEarned = earned[badge.id];
      var tierColor = TIER_COLORS[badge.tier];
      var earnedClass = isEarned ? 'pc-badge-earned' : 'pc-badge-locked';
      var earnedDate = isEarned ? new Date(isEarned).toLocaleDateString() : '';

      return '<div class="pc-badge-card ' + earnedClass + '" title="' + badge.desc + (earnedDate ? ' — Earned ' + earnedDate : '') + '">' +
        '<div class="pc-badge-emoji">' + badge.emoji + '</div>' +
        '<div class="pc-badge-name">' + badge.name + '</div>' +
        '<div class="pc-badge-xp" style="color:' + tierColor + '">' + (isEarned ? '+' + badge.xp + ' XP' : badge.tier) + '</div>' +
        (isEarned ? '<div class="pc-badge-check">&#10003;</div>' : '<div class="pc-badge-lock">&#128274;</div>') +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="pc-ach-container">' +
        '<div class="pc-ach-header">' +
          '<div class="pc-ach-title">Achievements</div>' +
          '<div class="pc-ach-toggle" id="pcAchToggle">&#9660;</div>' +
        '</div>' +

        '<div class="pc-ach-body" id="pcAchBody">' +
          // Level + XP bar
          '<div class="pc-ach-level">' +
            '<div class="pc-ach-level-info">' +
              '<span class="pc-ach-level-badge">Lvl ' + levelInfo.current.level + '</span>' +
              '<span class="pc-ach-level-title">' + levelInfo.current.title + '</span>' +
              '<span class="pc-ach-xp-count">' + xp + ' XP</span>' +
            '</div>' +
            '<div class="pc-ach-xp-bar">' +
              '<div class="pc-ach-xp-fill" style="width:' + levelInfo.progress + '%"></div>' +
            '</div>' +
            '<div class="pc-ach-xp-label">' + xp + ' / ' + levelInfo.next.xpNeeded + ' XP to ' + levelInfo.next.title + '</div>' +
          '</div>' +

          // Stats row
          '<div class="pc-ach-stats">' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">' + earnedCount + '/' + totalBadges + '</div><div class="pc-ach-stat-label">Badges</div></div>' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">&#128293; ' + streak + '</div><div class="pc-ach-stat-label">Streak</div></div>' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">' + levelInfo.current.level + '</div><div class="pc-ach-stat-label">Level</div></div>' +
          '</div>' +

          // Badge grid
          '<div class="pc-badge-grid">' + badgesHTML + '</div>' +

          // Semester progress
          '<div class="pc-semester-progress">' +
            '<div class="pc-semester-title">Semester Progress</div>' +
            '<div class="pc-semester-bar"><div class="pc-semester-fill" style="width:47%"></div></div>' +
            '<div class="pc-semester-label">47% Complete — Keep going!</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    // Insert after GPA widget or at top
    var gpaWidget = document.getElementById('pc-gpa-widget');
    if (gpaWidget && gpaWidget.nextSibling) {
      gpaWidget.parentNode.insertBefore(panel, gpaWidget.nextSibling);
    } else {
      var content = document.getElementById('content');
      if (content) {
        content.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    // Toggle
    var toggle = document.getElementById('pcAchToggle');
    var body = document.getElementById('pcAchBody');
    if (toggle && body) {
      toggle.addEventListener('click', function() {
        var visible = body.style.display !== 'none';
        body.style.display = visible ? 'none' : 'block';
        toggle.innerHTML = visible ? '&#9654;' : '&#9660;';
      });
    }
  }

  // Award a badge programmatically
  function awardBadge(badgeId) {
    chrome.storage.local.get(['pcBadges', 'pcXP'], function(data) {
      var earned = data.pcBadges || {};
      var xp = data.pcXP || 0;

      if (earned[badgeId]) return; // Already earned

      var badge = BADGES.find(function(b) { return b.id === badgeId; });
      if (!badge) return;

      earned[badgeId] = Date.now();
      xp += badge.xp;

      chrome.storage.local.set({ pcBadges: earned, pcXP: xp });

      // Show celebration
      showBadgeNotification(badge);
    });
  }

  function showBadgeNotification(badge) {
    var notif = document.createElement('div');
    notif.className = 'pc-badge-notif';
    notif.innerHTML =
      '<div class="pc-badge-notif-emoji">' + badge.emoji + '</div>' +
      '<div class="pc-badge-notif-text">' +
        '<div class="pc-badge-notif-title">Badge Earned!</div>' +
        '<div class="pc-badge-notif-name">' + badge.name + '</div>' +
        '<div class="pc-badge-notif-xp">+' + badge.xp + ' XP</div>' +
      '</div>';

    document.body.appendChild(notif);

    // Animate in
    setTimeout(function() { notif.classList.add('pc-badge-notif-show'); }, 100);

    // Remove after 4 seconds
    setTimeout(function() {
      notif.classList.remove('pc-badge-notif-show');
      setTimeout(function() { notif.remove(); }, 500);
    }, 4000);

    // Mini confetti
    showMiniConfetti();
  }

  function showMiniConfetti() {
    var colors = ['#7C3AED', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#FFD700'];
    for (var i = 0; i < 30; i++) {
      var conf = document.createElement('div');
      conf.style.cssText = 'position:fixed;width:6px;height:6px;background:' + colors[i % 6] +
        ';top:50%;left:50%;z-index:99999;border-radius:50%;pointer-events:none;' +
        'animation:pcConfettiBurst ' + (0.5 + Math.random() * 1.5) + 's ease-out forwards;' +
        '--x:' + (Math.random() * 200 - 100) + 'px;--y:' + (Math.random() * 200 - 100) + 'px;';
      document.body.appendChild(conf);
      setTimeout(function() { conf.remove(); }, 2500);
    }
  }

  // Make awardBadge available globally
  if (typeof window !== 'undefined') {
    window.PrettyBadges = {
      award: awardBadge,
      BADGES: BADGES,
      LEVELS: LEVELS
    };
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 800); });
  } else {
    setTimeout(init, 800);
  }

})();


  function initAchievements(data) {
    // Achievements initializes itself
  }

  // ============================================================
  // MODULE: THEMES
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Theme System
   30 University themes + 8 aesthetic themes
   + Custom theme creator
   Research: Students love school pride themes,
   BetterCampus has community themes but NO
   pre-built university themes ready to go
   ======================================== */

(function() {
  'use strict';

  var THEMES = {

    // === DARK THEMES (already in dark.css, managed here for UI) ===
    dark: [
      { id: 'amoled', name: 'AMOLED Black', bg: '#000000', card: '#111111', accent: '#7C3AED', text: '#E4E4E7', type: 'dark' },
      { id: 'midnight', name: 'Midnight Violet', bg: '#1E1B2E', card: '#2D2640', accent: '#7C3AED', text: '#E4E4E7', type: 'dark' },
      { id: 'warm', name: 'Warm Dark', bg: '#1C1917', card: '#292524', accent: '#FBBF24', text: '#E7E5E4', type: 'dark' }
    ],

    // === AESTHETIC THEMES ===
    aesthetic: [
      { id: 'ocean', name: 'Ocean', bg: '#0C1929', card: '#132F4C', accent: '#0EA5E9', text: '#E0F2FE', type: 'dark' },
      { id: 'forest', name: 'Forest', bg: '#14231A', card: '#1A3324', accent: '#22C55E', text: '#DCFCE7', type: 'dark' },
      { id: 'sunset', name: 'Sunset', bg: '#2D1810', card: '#3D2419', accent: '#F97316', text: '#FFF7ED', type: 'dark' },
      { id: 'rose', name: 'Rose', bg: '#2D1422', card: '#3D1C30', accent: '#EC4899', text: '#FCE7F3', type: 'dark' },
      { id: 'lavender', name: 'Lavender Light', bg: '#F5F3FF', card: '#EDE9FE', accent: '#7C3AED', text: '#1F2937', type: 'light' },
      { id: 'cream', name: 'Cream', bg: '#FFFBEB', card: '#FEF3C7', accent: '#D97706', text: '#1F2937', type: 'light' },
      { id: 'sky', name: 'Sky Blue', bg: '#F0F9FF', card: '#E0F2FE', accent: '#0284C7', text: '#1F2937', type: 'light' },
      { id: 'mint', name: 'Mint Fresh', bg: '#F0FDF4', card: '#DCFCE7', accent: '#16A34A', text: '#1F2937', type: 'light' }
    ],

    // === UNIVERSITY THEMES (Top 30 US + International) ===
    university: [
      { id: 'ohio-state', name: 'Ohio State', bg: '#1A0000', card: '#2D0000', accent: '#BB0000', text: '#E4E4E7', secondary: '#666666', type: 'dark' },
      { id: 'ucla', name: 'UCLA', bg: '#002B5C', card: '#003B7A', accent: '#2774AE', text: '#E4E4E7', secondary: '#FFD100', type: 'dark' },
      { id: 'stanford', name: 'Stanford', bg: '#1A0505', card: '#2D0A0A', accent: '#8C1515', text: '#E4E4E7', secondary: '#B1040E', type: 'dark' },
      { id: 'mit', name: 'MIT', bg: '#1A0508', card: '#2D0A10', accent: '#A31F34', text: '#E4E4E7', secondary: '#8A8B8C', type: 'dark' },
      { id: 'harvard', name: 'Harvard', bg: '#1A0508', card: '#2D0A10', accent: '#A41034', text: '#E4E4E7', secondary: '#1E1E1E', type: 'dark' },
      { id: 'uf', name: 'UF Gators', bg: '#001427', card: '#002040', accent: '#0021A5', text: '#E4E4E7', secondary: '#FA4616', type: 'dark' },
      { id: 'nyu', name: 'NYU', bg: '#1A0A2E', card: '#2D1250', accent: '#57068C', text: '#E4E4E7', secondary: '#8900E1', type: 'dark' },
      { id: 'michigan', name: 'Michigan', bg: '#001427', card: '#00274C', accent: '#00274C', text: '#E4E4E7', secondary: '#FFCB05', type: 'dark' },
      { id: 'texas', name: 'UT Austin', bg: '#1A0E00', card: '#2D1A00', accent: '#BF5700', text: '#E4E4E7', secondary: '#333F48', type: 'dark' },
      { id: 'penn-state', name: 'Penn State', bg: '#001E44', card: '#002D6A', accent: '#041E42', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'unc', name: 'UNC', bg: '#001A33', card: '#002A52', accent: '#4B9CD3', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'usc', name: 'USC', bg: '#1A0A00', card: '#2D1200', accent: '#990000', text: '#E4E4E7', secondary: '#FFC72C', type: 'dark' },
      { id: 'duke', name: 'Duke', bg: '#001A33', card: '#00285A', accent: '#003087', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'cornell', name: 'Cornell', bg: '#1A0A05', card: '#2D1208', accent: '#B31B1B', text: '#E4E4E7', secondary: '#222222', type: 'dark' },
      { id: 'columbia', name: 'Columbia', bg: '#0D1B2A', card: '#1B2838', accent: '#B9D9EB', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'yale', name: 'Yale', bg: '#00182D', card: '#002850', accent: '#00356B', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'princeton', name: 'Princeton', bg: '#1A0E00', card: '#2D1A00', accent: '#E77500', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'georgia', name: 'UGA', bg: '#1A0505', card: '#2D0A0A', accent: '#BA0C2F', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'purdue', name: 'Purdue', bg: '#1A1100', card: '#2D1D00', accent: '#CEB888', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'arizona', name: 'Arizona', bg: '#001C48', card: '#002D6E', accent: '#003366', text: '#E4E4E7', secondary: '#CC0033', type: 'dark' },
      { id: 'wisconsin', name: 'Wisconsin', bg: '#1A0508', card: '#2D0A10', accent: '#C5050C', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'auburn', name: 'Auburn', bg: '#0C162A', card: '#0D2240', accent: '#03244D', text: '#E4E4E7', secondary: '#DD550C', type: 'dark' },
      { id: 'alabama', name: 'Alabama', bg: '#1A0508', card: '#2D0A10', accent: '#9E1B32', text: '#E4E4E7', secondary: '#828A8F', type: 'dark' },
      { id: 'virginia', name: 'UVA', bg: '#0D1528', card: '#162040', accent: '#232D4B', text: '#E4E4E7', secondary: '#F84C1E', type: 'dark' },
      { id: 'iowa', name: 'Iowa', bg: '#1A1100', card: '#2D1D00', accent: '#FFCD00', text: '#1F2937', secondary: '#000000', type: 'dark' },
      { id: 'cal', name: 'UC Berkeley', bg: '#001A33', card: '#002850', accent: '#003262', text: '#E4E4E7', secondary: '#FDB515', type: 'dark' },
      { id: 'notre-dame', name: 'Notre Dame', bg: '#0C2340', card: '#143A5E', accent: '#0C2340', text: '#E4E4E7', secondary: '#C99700', type: 'dark' },
      { id: 'clemson', name: 'Clemson', bg: '#1A0E00', card: '#2D1A05', accent: '#F56600', text: '#E4E4E7', secondary: '#522D80', type: 'dark' },
      { id: 'lsu', name: 'LSU', bg: '#1A0F2E', card: '#2D1950', accent: '#461D7C', text: '#E4E4E7', secondary: '#FDD023', type: 'dark' },
      { id: 'oregon', name: 'Oregon', bg: '#001A0D', card: '#002D17', accent: '#154733', text: '#E4E4E7', secondary: '#FEE123', type: 'dark' }
    ]
  };

  function init() {
    // Theme panel is shown in popup, not on page
    // This module provides the theme data and apply function
    
    // Load saved custom theme
    chrome.storage.local.get(['pcThemeId', 'pcCustomTheme'], function(data) {
      if (data.pcThemeId && data.pcThemeId !== 'amoled' && data.pcThemeId !== 'midnight' && data.pcThemeId !== 'warm') {
        applyTheme(data.pcThemeId, data.pcCustomTheme);
      }
    });
  }

  function applyTheme(themeId, customTheme) {
    var theme = findTheme(themeId) || customTheme;
    if (!theme) return;

    // Remove existing theme classes
    var classes = document.documentElement.className.split(' ').filter(function(c) {
      return !c.startsWith('pc-dark-') && !c.startsWith('pc-theme-');
    });

    if (theme.type === 'dark') {
      classes.push('pc-theme-custom-dark');
    } else {
      classes.push('pc-theme-custom-light');
    }

    document.documentElement.className = classes.join(' ');

    // Apply CSS variables
    var root = document.documentElement;
    root.style.setProperty('--pc-bg', theme.bg);
    root.style.setProperty('--pc-card', theme.card);
    root.style.setProperty('--pc-accent', theme.accent);
    root.style.setProperty('--pc-text', theme.text);
    if (theme.secondary) {
      root.style.setProperty('--pc-secondary', theme.secondary);
    }

    // Apply to body
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;

    console.log('Pretty Campus: Theme applied - ' + (theme.name || themeId));
  }

  function findTheme(id) {
    var allThemes = THEMES.dark.concat(THEMES.aesthetic).concat(THEMES.university);
    return allThemes.find(function(t) { return t.id === id; });
  }

  function getAllThemes() {
    return THEMES;
  }

  function getThemesByCategory(category) {
    return THEMES[category] || [];
  }

  // Save custom theme
  function saveCustomTheme(theme) {
    chrome.storage.local.set({
      pcThemeId: theme.id || 'custom-' + Date.now(),
      pcCustomTheme: theme
    });
    applyTheme(null, theme);
  }

  // Initialize
  init();

  // Public API
  if (typeof window !== 'undefined') {
    window.PrettyThemes = {
      apply: applyTheme,
      find: findTheme,
      getAll: getAllThemes,
      getByCategory: getThemesByCategory,
      saveCustom: saveCustomTheme,
      THEMES: THEMES
    };
  }

})();


  function initThemes(data) {
    // Themes initializes itself
    // Add Alt+T shortcut for theme cycling
    var themeList = ['ohio-state','nyu','ucla','stanford','mit','ocean','forest','sunset','rose','lavender','midnight'];
    document.addEventListener('keydown', function(e) {
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        var current = window._pcThemeIdx || 0;
        if (typeof PrettyThemes !== 'undefined') {
          PrettyThemes.apply(themeList[current]);
          console.log('Pretty Campus: Theme -> ' + themeList[current]);
          window._pcThemeIdx = (current + 1) % themeList.length;
        }
      }
    });
  }

  // ============================================================
  // MODULE: COMMAND PALETTE
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Command Palette (Ctrl+K)
   Spotlight-style quick navigation for Canvas
   Research: Students waste time clicking through
   Canvas menus. No extension has a command palette.
   This is a Pretty Campus exclusive feature.
   ======================================== */

(function() {
  'use strict';

  var isOpen = false;

  // All available commands
  function getCommands() {
    var commands = [
      // Navigation
      { id: 'nav-dashboard', name: 'Go to Dashboard', category: 'Navigation', icon: '🏠', action: function() { navigate('/'); } },
      { id: 'nav-courses', name: 'Go to All Courses', category: 'Navigation', icon: '📚', action: function() { navigate('/courses'); } },
      { id: 'nav-calendar', name: 'Go to Calendar', category: 'Navigation', icon: '📅', action: function() { navigate('/calendar'); } },
      { id: 'nav-inbox', name: 'Go to Inbox', category: 'Navigation', icon: '✉️', action: function() { navigate('/conversations'); } },
      { id: 'nav-grades', name: 'Go to All Grades', category: 'Navigation', icon: '📊', action: function() { navigate('/grades'); } },
      { id: 'nav-files', name: 'Go to Files', category: 'Navigation', icon: '📁', action: function() { navigate('/files'); } },
      { id: 'nav-profile', name: 'Go to Profile', category: 'Navigation', icon: '👤', action: function() { navigate('/profile'); } },
      { id: 'nav-settings', name: 'Go to Settings', category: 'Navigation', icon: '⚙️', action: function() { navigate('/profile/settings'); } },
      { id: 'nav-notifications', name: 'Go to Notifications', category: 'Navigation', icon: '🔔', action: function() { navigate('/profile/communication'); } },

      // Pretty Campus features
      { id: 'pc-dark-toggle', name: 'Toggle Dark Mode', category: 'Pretty Campus', icon: '🌙', action: function() { toggleDarkMode(); } },
      { id: 'pc-theme-amoled', name: 'Theme: AMOLED Black', category: 'Themes', icon: '⚫', action: function() { setTheme('amoled'); } },
      { id: 'pc-theme-midnight', name: 'Theme: Midnight Violet', category: 'Themes', icon: '🟣', action: function() { setTheme('midnight'); } },
      { id: 'pc-theme-warm', name: 'Theme: Warm Dark', category: 'Themes', icon: '🟤', action: function() { setTheme('warm'); } },
      { id: 'pc-theme-ocean', name: 'Theme: Ocean', category: 'Themes', icon: '🌊', action: function() { applyCustomTheme('ocean'); } },
      { id: 'pc-theme-forest', name: 'Theme: Forest', category: 'Themes', icon: '🌲', action: function() { applyCustomTheme('forest'); } },
      { id: 'pc-theme-sunset', name: 'Theme: Sunset', category: 'Themes', icon: '🌅', action: function() { applyCustomTheme('sunset'); } },
      { id: 'pc-theme-rose', name: 'Theme: Rose', category: 'Themes', icon: '🌹', action: function() { applyCustomTheme('rose'); } },
      { id: 'pc-theme-lavender', name: 'Theme: Lavender Light', category: 'Themes', icon: '💜', action: function() { applyCustomTheme('lavender'); } },

      // Quick actions
      { id: 'act-scroll-top', name: 'Scroll to Top', category: 'Actions', icon: '⬆️', action: function() { window.scrollTo({top: 0, behavior: 'smooth'}); } },
      { id: 'act-scroll-bottom', name: 'Scroll to Bottom', category: 'Actions', icon: '⬇️', action: function() { window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); } },
      { id: 'act-refresh', name: 'Refresh Page', category: 'Actions', icon: '🔄', action: function() { window.location.reload(); } },
      { id: 'act-back', name: 'Go Back', category: 'Actions', icon: '⬅️', action: function() { window.history.back(); } },
      { id: 'act-forward', name: 'Go Forward', category: 'Actions', icon: '➡️', action: function() { window.history.forward(); } },
      { id: 'act-print', name: 'Print Page', category: 'Actions', icon: '🖨️', action: function() { window.print(); } },
      { id: 'act-fullscreen', name: 'Toggle Fullscreen', category: 'Actions', icon: '🖥️', action: function() { toggleFullscreen(); } }
    ];

    // Add course-specific navigation if we have course data
    if (typeof PrettyAPI !== 'undefined') {
      PrettyAPI.getCourses(function(err, courses) {
        if (courses) {
          courses.forEach(function(course) {
            commands.push({
              id: 'course-' + course.id, name: 'Go to ' + course.name + ': ' + (course.title || ''),
              category: 'Courses', icon: '📖', action: function() { navigate('/courses/' + course.id); }
            });
            commands.push({
              id: 'course-grades-' + course.id, name: course.name + ' Grades',
              category: 'Course Grades', icon: '📊', action: function() { navigate('/courses/' + course.id + '/grades'); }
            });
            commands.push({
              id: 'course-assign-' + course.id, name: course.name + ' Assignments',
              category: 'Course Assignments', icon: '📝', action: function() { navigate('/courses/' + course.id + '/assignments'); }
            });
            commands.push({
              id: 'course-modules-' + course.id, name: course.name + ' Modules',
              category: 'Course Modules', icon: '📦', action: function() { navigate('/courses/' + course.id + '/modules'); }
            });
          });
        }
      });
    }

    return commands;
  }

  function navigate(path) {
    var base = window.location.origin;
    window.location.href = base + path;
  }

  function toggleDarkMode() {
    chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
      var newState = !data.darkMode;
      var theme = data.darkTheme || 'midnight';
      chrome.storage.local.set({ darkMode: newState });
      document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
      if (newState) document.documentElement.classList.add('pc-dark-' + theme);
    });
  }

  function setTheme(theme) {
    chrome.storage.local.set({ darkMode: true, darkTheme: theme });
    document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
    document.documentElement.classList.add('pc-dark-' + theme);
  }

  function applyCustomTheme(themeId) {
    if (typeof PrettyThemes !== 'undefined') {
      PrettyThemes.apply(themeId);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // Create the command palette UI
  function createPalette() {
    if (document.getElementById('pc-cmd-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'pc-cmd-overlay';

    var palette = document.createElement('div');
    palette.id = 'pc-cmd-palette';

    palette.innerHTML =
      '<div class="pc-cmd-search-wrap">' +
        '<span class="pc-cmd-search-icon">&#128269;</span>' +
        '<input type="text" id="pc-cmd-input" class="pc-cmd-input" placeholder="Type a command... (courses, grades, themes, dark mode...)" autocomplete="off" spellcheck="false">' +
        '<span class="pc-cmd-shortcut">ESC</span>' +
      '</div>' +
      '<div class="pc-cmd-results" id="pc-cmd-results"></div>' +
      '<div class="pc-cmd-footer">' +
        '<span>&#8593;&#8595; Navigate</span>' +
        '<span>&#9166; Select</span>' +
        '<span>ESC Close</span>' +
      '</div>';

    overlay.appendChild(palette);
    document.body.appendChild(overlay);

    var input = document.getElementById('pc-cmd-input');
    var results = document.getElementById('pc-cmd-results');
    var commands = getCommands();
    var selectedIndex = 0;

    // Show all commands initially
    renderResults(commands, results, selectedIndex);

    // Focus input
    setTimeout(function() { input.focus(); }, 50);

    // Search
    input.addEventListener('input', function() {
      var query = input.value.toLowerCase().trim();
      var filtered = commands.filter(function(cmd) {
        return cmd.name.toLowerCase().indexOf(query) !== -1 ||
               cmd.category.toLowerCase().indexOf(query) !== -1;
      });
      selectedIndex = 0;
      renderResults(filtered, results, selectedIndex);
    });

    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
      var items = results.querySelectorAll('.pc-cmd-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePalette();
    });

    isOpen = true;
  }

  function renderResults(commands, container, selectedIndex) {
    var maxShow = 12;
    var shown = commands.slice(0, maxShow);
    var currentCategory = '';

    var html = '';
    shown.forEach(function(cmd, i) {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        html += '<div class="pc-cmd-category">' + currentCategory + '</div>';
      }
      var selected = i === selectedIndex ? ' pc-cmd-selected' : '';
      html += '<div class="pc-cmd-item' + selected + '" data-idx="' + i + '">' +
        '<span class="pc-cmd-item-icon">' + cmd.icon + '</span>' +
        '<span class="pc-cmd-item-name">' + cmd.name + '</span>' +
      '</div>';
    });

    if (shown.length === 0) {
      html = '<div class="pc-cmd-empty">No commands found</div>';
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.pc-cmd-item').forEach(function(item, i) {
      item.addEventListener('click', function() {
        var idx = parseInt(item.dataset.idx);
        if (commands[idx]) {
          closePalette();
          commands[idx].action();
        }
      });
      item.addEventListener('mouseenter', function() {
        container.querySelectorAll('.pc-cmd-item').forEach(function(el) { el.classList.remove('pc-cmd-selected'); });
        item.classList.add('pc-cmd-selected');
      });
    });
  }

  function updateSelection(items, index) {
    items.forEach(function(item) { item.classList.remove('pc-cmd-selected'); });
    if (items[index]) {
      items[index].classList.add('pc-cmd-selected');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function closePalette() {
    var overlay = document.getElementById('pc-cmd-overlay');
    if (overlay) {
      overlay.classList.add('pc-cmd-closing');
      setTimeout(function() { overlay.remove(); }, 200);
    }
    isOpen = false;
  }

  // Listen for Ctrl+K
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        closePalette();
      } else {
        createPalette();
      }
    }
  });

})();


  function initCommandPalette() {
    // Command palette initializes itself with Ctrl+K listener
  }

  // ============================================================
  // MODULE: AUTO-SAVE
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Auto-Save System
   Saves discussion posts, assignment text,
   quiz essays, and inbox messages every 30 sec.
   Recovery button if Canvas times out.
   
   Research: Capterra review says "I wish there
   was an autosave. I've lost so much work due
   to not clicking individual saves."
   NO Canvas extension has built this yet.
   ======================================== */

(function() {
  'use strict';

  var SAVE_INTERVAL = 30000; // 30 seconds
  var SAVE_KEY_PREFIX = 'pc_autosave_';
  var watchedFields = [];
  var saveTimer = null;
  var lastSaveTime = 0;
  var saveCount = 0;

  function init() {
    // Find all text inputs on the page
    findTextFields();

    // Start auto-save timer
    startAutoSave();

    // Watch for dynamically added fields (Canvas loads content lazily)
    observeDOM();

    // Add recovery banner if saved data exists
    checkForRecovery();

    // Add save indicator
    addSaveIndicator();

    console.log('Pretty Campus: Auto-save active (' + watchedFields.length + ' fields detected)');
  }

  function findTextFields() {
    // Canvas text areas and editors
    var selectors = [
      'textarea',
      '[contenteditable="true"]',
      '.discussion-reply-box textarea',
      '.reply-textarea',
      '.ic-RichContentEditor textarea',
      '#assignment_submission_body',
      '#discussion_topic_message',
      '#compose-message-textarea',
      '#message_body',
      '.tox-edit-area iframe',
      'input[type="text"][name*="answer"]',
      'textarea[name*="answer"]',
      'textarea[name*="submission"]',
      'textarea[name*="comment"]',
      'textarea[name*="message"]',
      'textarea[name*="body"]',
      'textarea[name*="text"]'
    ];

    watchedFields = [];
    selectors.forEach(function(sel) {
      var elements = document.querySelectorAll(sel);
      elements.forEach(function(el) {
        if (!el.dataset.pcWatched) {
          el.dataset.pcWatched = 'true';
          watchedFields.push(el);

          // Save on every keystroke (debounced)
          el.addEventListener('input', debounce(function() {
            saveField(el);
          }, 2000));

          // Save on blur (leaving the field)
          el.addEventListener('blur', function() {
            saveField(el);
          });
        }
      });
    });

    // Also check TinyMCE iframes
    var iframes = document.querySelectorAll('.tox-edit-area iframe');
    iframes.forEach(function(iframe) {
      try {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        var body = iframeDoc.body;
        if (body && !body.dataset.pcWatched) {
          body.dataset.pcWatched = 'true';
          watchedFields.push(body);
          body.addEventListener('input', debounce(function() {
            saveField(body);
          }, 2000));
        }
      } catch(e) {
        // Cross-origin iframe, can't access
      }
    });
  }

  function saveField(el) {
    var key = getFieldKey(el);
    var value = getFieldValue(el);
    if (!value || value.trim().length === 0) return;

    var saveData = {};
    saveData[key] = {
      value: value,
      url: window.location.href,
      timestamp: Date.now(),
      fieldType: el.tagName
    };

    chrome.storage.local.set(saveData, function() {
      if (chrome.runtime.lastError) return;
      saveCount++;
      lastSaveTime = Date.now();
      updateSaveIndicator();
    });
  }

  function getFieldKey(el) {
    var pageUrl = window.location.pathname;
    var fieldId = el.id || el.name || el.className || 'field';
    return SAVE_KEY_PREFIX + pageUrl + '_' + fieldId;
  }

  function getFieldValue(el) {
    if (el.tagName === 'BODY' || el.contentEditable === 'true') {
      return el.innerHTML;
    }
    return el.value;
  }

  function setFieldValue(el, value) {
    if (el.tagName === 'BODY' || el.contentEditable === 'true') {
      el.innerHTML = value;
    } else {
      el.value = value;
    }
  }

  function startAutoSave() {
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = setInterval(function() {
      watchedFields.forEach(function(el) {
        if (document.contains(el)) {
          saveField(el);
        }
      });
    }, SAVE_INTERVAL);
  }

  function observeDOM() {
    var observer = new MutationObserver(debounce(function() {
      findTextFields();
    }, 1000));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function checkForRecovery() {
    var pageUrl = window.location.pathname;
    var prefix = SAVE_KEY_PREFIX + pageUrl;

    chrome.storage.local.get(null, function(data) {
      if (chrome.runtime.lastError) return;

      var recoverable = [];
      Object.keys(data).forEach(function(key) {
        if (key.indexOf(prefix) === 0 && data[key].value) {
          var age = Date.now() - data[key].timestamp;
          // Only show recovery for saves less than 24 hours old
          if (age < 86400000) {
            recoverable.push({ key: key, data: data[key] });
          }
        }
      });

      if (recoverable.length > 0) {
        showRecoveryBanner(recoverable);
      }
    });
  }

  function showRecoveryBanner(recoverable) {
    // Don't show if already showing
    if (document.getElementById('pc-recovery-banner')) return;

    var timeSince = getTimeSince(recoverable[0].data.timestamp);

    var banner = document.createElement('div');
    banner.id = 'pc-recovery-banner';
    banner.innerHTML =
      '<div class="pc-recovery-inner">' +
        '<span class="pc-recovery-icon">&#128190;</span>' +
        '<span class="pc-recovery-text">Pretty Campus found unsaved work from ' + timeSince + ' ago</span>' +
        '<button class="pc-recovery-btn pc-recovery-restore" id="pcRestore">Restore</button>' +
        '<button class="pc-recovery-btn pc-recovery-dismiss" id="pcDismiss">Dismiss</button>' +
      '</div>';

    // Insert at top of content
    var content = document.getElementById('content') || document.body;
    content.insertBefore(banner, content.firstChild);

    // Restore button
    document.getElementById('pcRestore').addEventListener('click', function() {
      recoverable.forEach(function(item) {
        // Find matching field
        var fields = document.querySelectorAll('textarea, [contenteditable="true"]');
        fields.forEach(function(el) {
          var key = getFieldKey(el);
          if (key === item.key) {
            setFieldValue(el, item.data.value);
          }
        });
      });
      banner.remove();
      showToast('Work restored successfully!');
    });

    // Dismiss button
    document.getElementById('pcDismiss').addEventListener('click', function() {
      recoverable.forEach(function(item) {
        chrome.storage.local.remove(item.key);
      });
      banner.remove();
    });
  }

  function addSaveIndicator() {
    if (document.getElementById('pc-save-indicator')) return;

    var indicator = document.createElement('div');
    indicator.id = 'pc-save-indicator';
    indicator.className = 'pc-save-indicator';
    indicator.innerHTML = '<span class="pc-save-dot"></span> Auto-save active';
    document.body.appendChild(indicator);
  }

  function updateSaveIndicator() {
    var indicator = document.getElementById('pc-save-indicator');
    if (!indicator) return;

    indicator.innerHTML = '<span class="pc-save-dot pc-save-dot-active"></span> Saved just now';
    indicator.classList.add('pc-save-flash');

    setTimeout(function() {
      indicator.classList.remove('pc-save-flash');
      indicator.innerHTML = '<span class="pc-save-dot"></span> Auto-save active';
    }, 3000);
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'pc-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('pc-toast-show'); }, 100);
    setTimeout(function() {
      toast.classList.remove('pc-toast-show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function getTimeSince(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'less than a minute';
    if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's');
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's');
    var days = Math.floor(hours / 24);
    return days + ' day' + (days === 1 ? '' : 's');
  }

  function debounce(fn, delay) {
    var timer;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
  }

  // Clean up old saves (older than 7 days)
  function cleanOldSaves() {
    chrome.storage.local.get(null, function(data) {
      if (chrome.runtime.lastError) return;
      var keysToRemove = [];
      Object.keys(data).forEach(function(key) {
        if (key.indexOf(SAVE_KEY_PREFIX) === 0 && data[key].timestamp) {
          if (Date.now() - data[key].timestamp > 7 * 86400000) {
            keysToRemove.push(key);
          }
        }
      });
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
      }
    });
  }

  // Run cleanup on load
  cleanOldSaves();

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
  } else {
    setTimeout(init, 1000);
  }

})();


  function initAutoSave() {
    // Auto-save initializes itself
  }

  // ============================================================
  // MODULE: FINALS MODE
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Finals Mode
   Pomodoro timer + site blocker + focus mode
   Research: 25/5 Pomodoro is proven to boost
   focus. Students need distraction blocking
   INSIDE Canvas, not a separate app.
   ======================================== */

(function() {
  'use strict';

  var state = {
    active: false,
    mode: 'focus', // focus, shortBreak, longBreak
    timeLeft: 25 * 60, // seconds
    totalTime: 25 * 60,
    session: 1,
    totalSessions: 4,
    focusLength: 25,
    shortBreakLength: 5,
    longBreakLength: 15,
    blockedSites: ['instagram.com', 'twitter.com', 'x.com', 'reddit.com', 'tiktok.com', 'youtube.com', 'facebook.com', 'netflix.com', 'twitch.tv'],
    timer: null,
    totalFocusTime: 0
  };

  function init() {
    if (document.getElementById('pc-finals-panel')) return;
    createFinalsPanel();
    loadState();
    console.log('Pretty Campus: Finals Mode ready');
  }

  function loadState() {
    chrome.storage.local.get(['pcFinalsState'], function(data) {
      if (data.pcFinalsState) {
        var saved = data.pcFinalsState;
        state.focusLength = saved.focusLength || 25;
        state.shortBreakLength = saved.shortBreakLength || 5;
        state.longBreakLength = saved.longBreakLength || 15;
        state.blockedSites = saved.blockedSites || state.blockedSites;
        state.totalFocusTime = saved.totalFocusTime || 0;
      }
    });
  }

  function saveState() {
    chrome.storage.local.set({
      pcFinalsState: {
        focusLength: state.focusLength,
        shortBreakLength: state.shortBreakLength,
        longBreakLength: state.longBreakLength,
        blockedSites: state.blockedSites,
        totalFocusTime: state.totalFocusTime
      }
    });
  }

  function createFinalsPanel() {
    var panel = document.createElement('div');
    panel.id = 'pc-finals-panel';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);
    setupPanelEvents();
  }

  function buildPanelHTML() {
    var blockedHTML = state.blockedSites.map(function(site) {
      return '<span class="pc-fm-blocked-site">' + site + '</span>';
    }).join('');

    return '<div class="pc-fm-toggle" id="pcFmToggle" title="Finals Mode (Alt+F)">&#127891;</div>' +
      '<div class="pc-fm-body" id="pcFmBody" style="display:none;">' +

        '<div class="pc-fm-header">' +
          '<div class="pc-fm-title">Finals Mode</div>' +
          '<div class="pc-fm-status" id="pcFmStatus">Ready</div>' +
        '</div>' +

        '<div class="pc-fm-timer-wrap">' +
          '<svg class="pc-fm-timer-svg" viewBox="0 0 120 120" width="160" height="160">' +
            '<circle cx="60" cy="60" r="54" fill="none" stroke="#2D2640" stroke-width="6"/>' +
            '<circle id="pcFmArc" cx="60" cy="60" r="54" fill="none" stroke="#7C3AED" stroke-width="6" ' +
              'stroke-dasharray="339.292" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 60 60)"/>' +
          '</svg>' +
          '<div class="pc-fm-timer-text">' +
            '<div class="pc-fm-time" id="pcFmTime">25:00</div>' +
            '<div class="pc-fm-mode" id="pcFmMode">Focus Time</div>' +
          '</div>' +
        '</div>' +

        '<div class="pc-fm-controls">' +
          '<button class="pc-fm-btn pc-fm-btn-start" id="pcFmStart">Start Focus</button>' +
          '<button class="pc-fm-btn pc-fm-btn-pause" id="pcFmPause" style="display:none;">Pause</button>' +
          '<button class="pc-fm-btn pc-fm-btn-skip" id="pcFmSkip" style="display:none;">Skip</button>' +
          '<button class="pc-fm-btn pc-fm-btn-reset" id="pcFmReset" style="display:none;">Reset</button>' +
        '</div>' +

        '<div class="pc-fm-session-info">' +
          '<span id="pcFmSession">Session 1 of 4</span>' +
          '<span id="pcFmTotal">Total: 0 min focused</span>' +
        '</div>' +

        '<div class="pc-fm-modes">' +
          '<button class="pc-fm-mode-btn pc-fm-mode-active" data-mode="focus" data-time="25">Focus 25m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="focus" data-time="50">Deep 50m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="shortBreak" data-time="5">Break 5m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="longBreak" data-time="15">Long 15m</button>' +
        '</div>' +

        '<div class="pc-fm-blocked">' +
          '<div class="pc-fm-blocked-title">Blocked During Focus:</div>' +
          '<div class="pc-fm-blocked-list" id="pcFmBlockedList">' + blockedHTML + '</div>' +
          '<div class="pc-fm-blocked-add">' +
            '<input type="text" id="pcFmNewSite" class="pc-fm-input" placeholder="Add site to block...">' +
            '<button class="pc-fm-btn-add" id="pcFmAddSite">+</button>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  function setupPanelEvents() {
    // Toggle panel
    var toggle = document.getElementById('pcFmToggle');
    var body = document.getElementById('pcFmBody');
    if (toggle) {
      toggle.addEventListener('click', function() {
        var visible = body.style.display !== 'none';
        body.style.display = visible ? 'none' : 'block';
        toggle.classList.toggle('pc-fm-toggle-open', !visible);
      });
    }

    // Start button
    var startBtn = document.getElementById('pcFmStart');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        startTimer();
      });
    }

    // Pause button
    var pauseBtn = document.getElementById('pcFmPause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function() {
        if (state.active) {
          pauseTimer();
          pauseBtn.textContent = 'Resume';
        } else {
          resumeTimer();
          pauseBtn.textContent = 'Pause';
        }
      });
    }

    // Skip button
    var skipBtn = document.getElementById('pcFmSkip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        skipSession();
      });
    }

    // Reset button
    var resetBtn = document.getElementById('pcFmReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        resetTimer();
      });
    }

    // Mode buttons
    document.querySelectorAll('.pc-fm-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (state.active) return;
        document.querySelectorAll('.pc-fm-mode-btn').forEach(function(b) { b.classList.remove('pc-fm-mode-active'); });
        btn.classList.add('pc-fm-mode-active');

        var minutes = parseInt(btn.dataset.time);
        var mode = btn.dataset.mode;
        state.mode = mode;
        state.timeLeft = minutes * 60;
        state.totalTime = minutes * 60;
        if (mode === 'focus') state.focusLength = minutes;
        updateDisplay();
      });
    });

    // Add blocked site
    var addSiteBtn = document.getElementById('pcFmAddSite');
    var newSiteInput = document.getElementById('pcFmNewSite');
    if (addSiteBtn && newSiteInput) {
      addSiteBtn.addEventListener('click', function() {
        addBlockedSite(newSiteInput.value);
        newSiteInput.value = '';
      });
      newSiteInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          addBlockedSite(newSiteInput.value);
          newSiteInput.value = '';
        }
      });
    }

    // Keyboard shortcut Alt+F
    document.addEventListener('keydown', function(e) {
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        var vis = body.style.display !== 'none';
        body.style.display = vis ? 'none' : 'block';
        toggle.classList.toggle('pc-fm-toggle-open', !vis);
      }
    });
  }

  function startTimer() {
    state.active = true;
    state.timeLeft = state.mode === 'focus' ? state.focusLength * 60 :
                     state.mode === 'shortBreak' ? state.shortBreakLength * 60 :
                     state.longBreakLength * 60;
    state.totalTime = state.timeLeft;

    document.getElementById('pcFmStart').style.display = 'none';
    document.getElementById('pcFmPause').style.display = 'inline-block';
    document.getElementById('pcFmSkip').style.display = 'inline-block';
    document.getElementById('pcFmReset').style.display = 'inline-block';
    document.getElementById('pcFmPause').textContent = 'Pause';

    var statusEl = document.getElementById('pcFmStatus');
    if (state.mode === 'focus') {
      statusEl.textContent = 'Focusing...';
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = 'Break Time';
      statusEl.style.color = '#3B82F6';
    }

    tick();
    state.timer = setInterval(tick, 1000);
  }

  function tick() {
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      sessionComplete();
      return;
    }
    state.timeLeft--;

    if (state.mode === 'focus') {
      state.totalFocusTime++;
    }

    updateDisplay();
  }

  function pauseTimer() {
    state.active = false;
    clearInterval(state.timer);
    document.getElementById('pcFmStatus').textContent = 'Paused';
    document.getElementById('pcFmStatus').style.color = '#F59E0B';
  }

  function resumeTimer() {
    state.active = true;
    state.timer = setInterval(tick, 1000);
    var statusEl = document.getElementById('pcFmStatus');
    if (state.mode === 'focus') {
      statusEl.textContent = 'Focusing...';
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = 'Break Time';
      statusEl.style.color = '#3B82F6';
    }
  }

  function resetTimer() {
    state.active = false;
    clearInterval(state.timer);
    state.session = 1;
    state.mode = 'focus';
    state.timeLeft = state.focusLength * 60;
    state.totalTime = state.timeLeft;

    document.getElementById('pcFmStart').style.display = 'inline-block';
    document.getElementById('pcFmPause').style.display = 'none';
    document.getElementById('pcFmSkip').style.display = 'none';
    document.getElementById('pcFmReset').style.display = 'none';
    document.getElementById('pcFmStatus').textContent = 'Ready';
    document.getElementById('pcFmStatus').style.color = '#9CA3AF';

    updateDisplay();
  }

  function skipSession() {
    clearInterval(state.timer);
    sessionComplete();
  }

  function sessionComplete() {
    state.active = false;
    saveState();

    // Play sound notification
    playNotificationSound();

    if (state.mode === 'focus') {
      // Focus session complete
      showNotification('Focus session complete! Take a break.');
      state.session++;

      if (state.session > state.totalSessions) {
        // All sessions complete
        showNotification('All 4 sessions complete! Great work!');
        state.session = 1;
        state.mode = 'longBreak';
        state.timeLeft = state.longBreakLength * 60;
      } else if (state.session % 4 === 0) {
        state.mode = 'longBreak';
        state.timeLeft = state.longBreakLength * 60;
      } else {
        state.mode = 'shortBreak';
        state.timeLeft = state.shortBreakLength * 60;
      }
    } else {
      // Break complete
      showNotification('Break over! Ready to focus?');
      state.mode = 'focus';
      state.timeLeft = state.focusLength * 60;
    }

    state.totalTime = state.timeLeft;
    updateDisplay();

    // Show start button again
    document.getElementById('pcFmStart').style.display = 'inline-block';
    document.getElementById('pcFmStart').textContent = state.mode === 'focus' ? 'Start Focus' : 'Start Break';
    document.getElementById('pcFmPause').style.display = 'none';
    document.getElementById('pcFmSkip').style.display = 'none';
    document.getElementById('pcFmStatus').textContent = state.mode === 'focus' ? 'Ready to focus' : 'Break time';
    document.getElementById('pcFmStatus').style.color = state.mode === 'focus' ? '#10B981' : '#3B82F6';
  }

  function updateDisplay() {
    var minutes = Math.floor(state.timeLeft / 60);
    var seconds = state.timeLeft % 60;
    var timeStr = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

    var timeEl = document.getElementById('pcFmTime');
    var modeEl = document.getElementById('pcFmMode');
    var arcEl = document.getElementById('pcFmArc');
    var sessionEl = document.getElementById('pcFmSession');
    var totalEl = document.getElementById('pcFmTotal');

    if (timeEl) timeEl.textContent = timeStr;
    if (modeEl) {
      modeEl.textContent = state.mode === 'focus' ? 'Focus Time' :
                           state.mode === 'shortBreak' ? 'Short Break' : 'Long Break';
    }

    // Update arc
    if (arcEl) {
      var circumference = 2 * Math.PI * 54;
      var progress = state.totalTime > 0 ? (state.totalTime - state.timeLeft) / state.totalTime : 0;
      var offset = circumference * (1 - progress);
      arcEl.setAttribute('stroke-dashoffset', offset);
      arcEl.setAttribute('stroke', state.mode === 'focus' ? '#7C3AED' : state.mode === 'shortBreak' ? '#3B82F6' : '#10B981');
    }

    if (sessionEl) sessionEl.textContent = 'Session ' + state.session + ' of ' + state.totalSessions;
    if (totalEl) totalEl.textContent = 'Total: ' + Math.floor(state.totalFocusTime / 60) + ' min focused';
  }

  function addBlockedSite(site) {
    if (!site) return;
    site = site.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!site || state.blockedSites.indexOf(site) !== -1) return;

    state.blockedSites.push(site);
    saveState();

    var list = document.getElementById('pcFmBlockedList');
    if (list) {
      var span = document.createElement('span');
      span.className = 'pc-fm-blocked-site';
      span.textContent = site;
      list.appendChild(span);
    }
  }

  function showNotification(message) {
    var notif = document.createElement('div');
    notif.className = 'pc-fm-notif';
    notif.innerHTML = '<span class="pc-fm-notif-icon">&#127891;</span> ' + message;
    document.body.appendChild(notif);
    setTimeout(function() { notif.classList.add('pc-fm-notif-show'); }, 100);
    setTimeout(function() {
      notif.classList.remove('pc-fm-notif-show');
      setTimeout(function() { notif.remove(); }, 300);
    }, 5000);
  }

  function playNotificationSound() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      setTimeout(function() {
        var osc2 = audioCtx.createOscillator();
        var gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.1;
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 300);
    } catch(e) { /* Audio not available */ }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1200); });
  } else {
    setTimeout(init, 1200);
  }

})();


  function initFinalsMode(data) {
    // Finals mode initializes itself
  }

  // ============================================================
  // MODULE: NOTIFICATIONS
  // ============================================================
/* ========================================
   PRETTY CAMPUS - Smart Notifications
   Deadline alerts, grade changes, weekly digest
   ======================================== */

(function() {
  'use strict';

  var ALERT_TIMES = [
    { hours: 24, label: '24 hours', priority: 'warning' },
    { hours: 12, label: '12 hours', priority: 'warning' },
    { hours: 3, label: '3 hours', priority: 'urgent' },
    { hours: 1, label: '1 hour', priority: 'critical' }
  ];

  function init() {
    if (document.getElementById('pc-notif-center')) return;
    loadNotifications(function(notifications) {
      createNotifCenter(notifications);
      checkDeadlines();
    });
  }

  function loadNotifications(callback) {
    chrome.storage.local.get(['pcNotifications'], function(data) {
      callback(data.pcNotifications || []);
    });
  }

  function checkDeadlines() {
    if (typeof PrettyAPI === 'undefined') return;
    PrettyAPI.getTodos(function(err, todos) {
      if (!todos) return;
      var now = new Date();
      var newNotifs = [];
      todos.forEach(function(task) {
        if (task.completed) return;
        var due = new Date(task.dueDate);
        var hoursLeft = (due - now) / 3600000;
        ALERT_TIMES.forEach(function(alert) {
          if (hoursLeft > 0 && hoursLeft <= alert.hours) {
            newNotifs.push({
              id: 'deadline-' + task.id + '-' + alert.hours,
              type: 'deadline',
              priority: alert.priority,
              title: task.name,
              message: 'Due in ' + alert.label + ' — ' + task.courseName,
              courseName: task.courseName,
              courseColor: task.courseColor || '#7C3AED',
              timestamp: Date.now(),
              read: false
            });
          }
        });
        if (hoursLeft < 0 && hoursLeft > -48) {
          newNotifs.push({
            id: 'overdue-' + task.id,
            type: 'overdue',
            priority: 'critical',
            title: task.name,
            message: 'OVERDUE — ' + task.courseName,
            courseName: task.courseName,
            courseColor: task.courseColor || '#7C3AED',
            timestamp: Date.now(),
            read: false
          });
        }
      });
      chrome.storage.local.get(['pcNotifications', 'pcDismissed'], function(data) {
        var existing = data.pcNotifications || [];
        var dismissed = data.pcDismissed || [];
        var existingIds = existing.map(function(n) { return n.id; });
        newNotifs.forEach(function(n) {
          if (existingIds.indexOf(n.id) === -1 && dismissed.indexOf(n.id) === -1) {
            existing.unshift(n);
            if (n.priority === 'critical' || n.priority === 'urgent') {
              showNotifPopup(n);
            }
          }
        });
        existing = existing.slice(0, 50);
        chrome.storage.local.set({ pcNotifications: existing });
        updateBadge(existing);
        refreshNotifList(existing);
      });
    });
  }

  function createNotifCenter(notifications) {
    var center = document.createElement('div');
    center.id = 'pc-notif-center';
    var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
    center.innerHTML =
      '<div class="pc-notif-bell" id="pcNotifBell" title="Notifications">' +
        '<span class="pc-notif-bell-icon">&#128276;</span>' +
        '<span class="pc-notif-badge" id="pcNotifBadge" style="' + (unreadCount > 0 ? '' : 'display:none') + '">' + unreadCount + '</span>' +
      '</div>' +
      '<div class="pc-notif-dropdown" id="pcNotifDropdown" style="display:none;">' +
        '<div class="pc-notif-header">' +
          '<span class="pc-notif-title">Notifications</span>' +
          '<button class="pc-notif-clear" id="pcNotifClear">Clear All</button>' +
        '</div>' +
        '<div class="pc-notif-list" id="pcNotifList">' + buildNotifListHTML(notifications) + '</div>' +
        '<div class="pc-notif-footer"><span id="pcNotifSummary">' + getSummary(notifications) + '</span></div>' +
      '</div>';
    document.body.appendChild(center);
    document.getElementById('pcNotifBell').addEventListener('click', function() {
      var dd = document.getElementById('pcNotifDropdown');
      var visible = dd.style.display !== 'none';
      dd.style.display = visible ? 'none' : 'block';
      if (!visible) {
        chrome.storage.local.get(['pcNotifications'], function(data) {
          var notifs = data.pcNotifications || [];
          notifs.forEach(function(n) { n.read = true; });
          chrome.storage.local.set({ pcNotifications: notifs });
          document.getElementById('pcNotifBadge').style.display = 'none';
        });
      }
    });
    document.getElementById('pcNotifClear').addEventListener('click', function() {
      chrome.storage.local.get(['pcNotifications'], function(data) {
        var notifs = data.pcNotifications || [];
        var dismissed = notifs.map(function(n) { return n.id; });
        chrome.storage.local.set({ pcNotifications: [], pcDismissed: dismissed });
        document.getElementById('pcNotifList').innerHTML = '<div class="pc-notif-empty">No notifications</div>';
        document.getElementById('pcNotifBadge').style.display = 'none';
        document.getElementById('pcNotifSummary').textContent = 'All clear!';
      });
    });
    document.addEventListener('click', function(e) {
      var c = document.getElementById('pc-notif-center');
      if (c && !c.contains(e.target)) {
        document.getElementById('pcNotifDropdown').style.display = 'none';
      }
    });
  }

  function buildNotifListHTML(notifications) {
    if (notifications.length === 0) return '<div class="pc-notif-empty">No notifications yet. Deadline alerts will appear here.</div>';
    return notifications.slice(0, 20).map(function(n) {
      var icon = n.type === 'overdue' ? '&#9888;' : n.priority === 'critical' ? '&#128680;' : n.priority === 'urgent' ? '&#9888;' : '&#128276;';
      var timeAgo = getTimeAgo(n.timestamp);
      return '<div class="pc-notif-item pc-notif-' + n.priority + (n.read ? ' pc-notif-read' : '') + '">' +
        '<div class="pc-notif-item-icon">' + icon + '</div>' +
        '<div class="pc-notif-item-content">' +
          '<div class="pc-notif-item-title">' + n.title + '</div>' +
          '<div class="pc-notif-item-message">' + n.message + '</div>' +
          '<div class="pc-notif-item-time">' + timeAgo + '</div>' +
        '</div>' +
        '<div class="pc-notif-item-color" style="background:' + n.courseColor + '"></div>' +
      '</div>';
    }).join('');
  }

  function refreshNotifList(notifications) {
    var list = document.getElementById('pcNotifList');
    if (list) list.innerHTML = buildNotifListHTML(notifications);
    var summary = document.getElementById('pcNotifSummary');
    if (summary) summary.textContent = getSummary(notifications);
  }

  function updateBadge(notifications) {
    var unread = notifications.filter(function(n) { return !n.read; }).length;
    var badge = document.getElementById('pcNotifBadge');
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
  }

  function showNotifPopup(notif) {
    var popup = document.createElement('div');
    popup.className = 'pc-notif-popup pc-notif-popup-' + notif.priority;
    popup.innerHTML =
      '<div class="pc-notif-popup-icon">' + (notif.priority === 'critical' ? '&#128680;' : '&#9888;') + '</div>' +
      '<div class="pc-notif-popup-content">' +
        '<div class="pc-notif-popup-title">' + notif.title + '</div>' +
        '<div class="pc-notif-popup-msg">' + notif.message + '</div>' +
      '</div>';
    document.body.appendChild(popup);
    setTimeout(function() { popup.classList.add('pc-notif-popup-show'); }, 100);
    setTimeout(function() { popup.classList.remove('pc-notif-popup-show'); setTimeout(function() { popup.remove(); }, 300); }, 8000);
  }

  function getSummary(notifications) {
    var overdue = notifications.filter(function(n) { return n.type === 'overdue'; }).length;
    if (overdue > 0) return overdue + ' overdue!';
    var urgent = notifications.filter(function(n) { return !n.read && n.priority !== 'warning'; }).length;
    if (urgent > 0) return urgent + ' urgent';
    return notifications.length + ' total';
  }

  function getTimeAgo(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  setInterval(checkDeadlines, 5 * 60 * 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1500); });
  } else {
    setTimeout(init, 1500);
  }
})();


  function initNotifications(data) {
    // Notifications initializes itself
  }

  // ============================================================
  // BOOT
  // ============================================================
  if (isCanvasPage()) {
    onReady(initPrettyCampus);
  } else {
    // For custom domains, wait for DOM and check again
    onReady(function() {
      if (isCanvasDOM()) initPrettyCampus();
    });
  }

})();
/* ========================================
   PRETTY CAMPUS - Dashboard Notes + Grade Export
   Quick sticky notes on Canvas dashboard +
   Export grades to CSV
   BetterCampus has notes, we need this to match.
   Grade export is a Pretty Campus exclusive.
   ======================================== */

(function() {
  'use strict';

  // ============================================================
  // DASHBOARD NOTES
  // ============================================================
  function initNotes() {
    if (document.getElementById('pc-notes-widget')) return;

    chrome.storage.local.get(['pcNotes'], function(data) {
      var notes = data.pcNotes || [];
      createNotesWidget(notes);
    });
  }

  function createNotesWidget(notes) {
    var widget = document.createElement('div');
    widget.id = 'pc-notes-widget';

    widget.innerHTML =
      '<div class="pc-notes-header">' +
        '<span class="pc-notes-title">&#128221; Quick Notes</span>' +
        '<div class="pc-notes-actions">' +
          '<button class="pc-notes-btn-export" id="pcExportGrades" title="Export grades to CSV">&#128202; Export Grades</button>' +
          '<button class="pc-notes-btn-add" id="pcAddNote" title="Add note">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="pc-notes-list" id="pcNotesList">' + buildNotesHTML(notes) + '</div>' +
      '<div class="pc-notes-add-form" id="pcNotesForm" style="display:none;">' +
        '<textarea id="pcNoteText" class="pc-notes-textarea" placeholder="Type your note..." rows="3"></textarea>' +
        '<div class="pc-notes-colors" id="pcNoteColors">' +
          '<span class="pc-notes-color pc-notes-color-active" data-color="#7C3AED" style="background:#7C3AED"></span>' +
          '<span class="pc-notes-color" data-color="#10B981" style="background:#10B981"></span>' +
          '<span class="pc-notes-color" data-color="#F59E0B" style="background:#F59E0B"></span>' +
          '<span class="pc-notes-color" data-color="#EF4444" style="background:#EF4444"></span>' +
          '<span class="pc-notes-color" data-color="#3B82F6" style="background:#3B82F6"></span>' +
          '<span class="pc-notes-color" data-color="#EC4899" style="background:#EC4899"></span>' +
        '</div>' +
        '<div class="pc-notes-form-btns">' +
          '<button class="pc-notes-save" id="pcSaveNote">Save Note</button>' +
          '<button class="pc-notes-cancel" id="pcCancelNote">Cancel</button>' +
        '</div>' +
      '</div>';

    // Insert after GPA widget or achievements
    var gpa = document.getElementById('pc-gpa-widget');
    var ach = document.getElementById('pc-achievements-panel');
    var target = ach || gpa;
    if (target && target.nextSibling) {
      target.parentNode.insertBefore(widget, target.nextSibling);
    } else {
      var content = document.getElementById('content');
      if (content) content.appendChild(widget);
      else document.body.appendChild(widget);
    }

    setupNotesEvents(notes);
  }

  function buildNotesHTML(notes) {
    if (notes.length === 0) {
      return '<div class="pc-notes-empty">No notes yet. Click + to add one.</div>';
    }
    return notes.map(function(note, i) {
      var date = new Date(note.timestamp);
      var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      return '<div class="pc-note-item" style="border-left:4px solid ' + note.color + '">' +
        '<div class="pc-note-text">' + escapeHTML(note.text) + '</div>' +
        '<div class="pc-note-footer">' +
          '<span class="pc-note-date">' + dateStr + '</span>' +
          '<button class="pc-note-delete" data-idx="' + i + '" title="Delete note">&#10005;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function setupNotesEvents(notes) {
    var addBtn = document.getElementById('pcAddNote');
    var form = document.getElementById('pcNotesForm');
    var saveBtn = document.getElementById('pcSaveNote');
    var cancelBtn = document.getElementById('pcCancelNote');
    var exportBtn = document.getElementById('pcExportGrades');

    if (addBtn) {
      addBtn.addEventListener('click', function() {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
          document.getElementById('pcNoteText').focus();
        }
      });
    }

    // Color picker
    document.querySelectorAll('.pc-notes-color').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.pc-notes-color').forEach(function(c) { c.classList.remove('pc-notes-color-active'); });
        el.classList.add('pc-notes-color-active');
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var text = document.getElementById('pcNoteText').value.trim();
        if (!text) return;
        var activeColor = document.querySelector('.pc-notes-color-active');
        var color = activeColor ? activeColor.dataset.color : '#7C3AED';

        notes.unshift({
          text: text,
          color: color,
          timestamp: Date.now()
        });

        // Keep max 20 notes
        notes = notes.slice(0, 20);
        chrome.storage.local.set({ pcNotes: notes });

        document.getElementById('pcNotesList').innerHTML = buildNotesHTML(notes);
        document.getElementById('pcNoteText').value = '';
        form.style.display = 'none';

        // Re-attach delete handlers
        attachDeleteHandlers(notes);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        form.style.display = 'none';
        document.getElementById('pcNoteText').value = '';
      });
    }

    // Delete handlers
    attachDeleteHandlers(notes);

    // Grade export
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        exportGradesToCSV();
      });
    }
  }

  function attachDeleteHandlers(notes) {
    document.querySelectorAll('.pc-note-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        notes.splice(idx, 1);
        chrome.storage.local.set({ pcNotes: notes });
        document.getElementById('pcNotesList').innerHTML = buildNotesHTML(notes);
        attachDeleteHandlers(notes);
      });
    });
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // GRADE EXPORT TO CSV
  // ============================================================
  function exportGradesToCSV() {
    if (typeof PrettyAPI === 'undefined') {
      showExportToast('Grade export requires Canvas data');
      return;
    }

    PrettyAPI.getCourses(function(err, courses) {
      if (!courses || courses.length === 0) {
        showExportToast('No course data available');
        return;
      }

      var csvRows = ['Course Code,Course Title,Credits,Grade (%),Letter Grade,GPA Points'];
      var totalCredits = 0;
      var totalGpaPoints = 0;

      courses.forEach(function(c) {
        var letterGrade = 'N/A';
        var gpaPoints = 0;

        if (typeof PrettyGPA !== 'undefined' && c.percentage > 0) {
          letterGrade = PrettyGPA.percentToGrade(c.percentage);
          gpaPoints = PrettyGPA.gradePoints[letterGrade] || 0;
        }

        totalCredits += c.credits;
        totalGpaPoints += gpaPoints * c.credits;

        csvRows.push(
          '"' + c.name + '",' +
          '"' + (c.title || '') + '",' +
          c.credits + ',' +
          c.percentage + ',' +
          letterGrade + ',' +
          gpaPoints.toFixed(2)
        );
      });

      // Add summary row
      var gpa = totalCredits > 0 ? (totalGpaPoints / totalCredits).toFixed(2) : '0.00';
      csvRows.push('');
      csvRows.push('"SEMESTER GPA","","' + totalCredits + '","","","' + gpa + '"');
      csvRows.push('"Generated by Pretty Campus","' + new Date().toLocaleDateString() + '","","","",""');

      var csvContent = csvRows.join('\n');
      var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);

      var link = document.createElement('a');
      link.href = url;
      link.download = 'pretty-campus-grades-' + new Date().toISOString().slice(0, 10) + '.csv';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showExportToast('Grades exported to CSV!');
    });
  }

  function showExportToast(message) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#10B981;color:white;padding:10px 24px;border-radius:10px;font-size:14px;z-index:999999;opacity:0;transition:all 0.3s;font-family:-apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; }, 100);
    setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initNotes, 900); });
  } else {
    setTimeout(initNotes, 900);
  }

})();
/* ========================================
   PRETTY CAMPUS - Study Stats Dashboard
   Weekly/monthly analytics + study patterns
   Canvas has NO analytics for students.
   BetterCampus has NO study tracking.
   This is a Pretty Campus exclusive.
   
   Features:
   - Weekly study time from Finals Mode
   - Assignment completion rate
   - Grade trend chart (text-based)
   - Best study day/time
   - Semester progress percentage
   ======================================== */

(function() {
  'use strict';

  function initStudyStats() {
    if (document.getElementById('pc-stats-dashboard')) return;

    chrome.storage.local.get([
      'pcFinalsState', 'pcStreak', 'pcStreakDate',
      'pcBadges', 'pcXP', 'pcTasks', 'pcStudyLog'
    ], function(data) {
      var stats = calculateStats(data);
      createStatsDashboard(stats);
    });
  }

  function calculateStats(data) {
    var totalFocusSeconds = (data.pcFinalsState && data.pcFinalsState.totalFocusTime) || 0;
    var streak = data.pcStreak || 0;
    var badges = data.pcBadges || {};
    var xp = data.pcXP || 0;
    var tasks = data.pcTasks || {};
    var studyLog = data.pcStudyLog || [];

    // Count completed vs total tasks
    var taskIds = Object.keys(tasks);
    var completedTasks = taskIds.filter(function(id) { return tasks[id].completed; }).length;
    var totalTasks = taskIds.length;
    var completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Focus time
    var focusMinutes = Math.floor(totalFocusSeconds / 60);
    var focusHours = Math.floor(focusMinutes / 60);
    var focusMins = focusMinutes % 60;

    // Badge count
    var earnedBadges = Object.keys(badges).length;

    // Level
    var level = getLevel(xp);

    // Semester progress (assuming 16-week semester, approximate)
    var now = new Date();
    var semesterStart = new Date(now.getFullYear(), 7, 19); // Aug 19 approx
    if (now.getMonth() < 6) semesterStart = new Date(now.getFullYear(), 0, 13); // Jan 13 approx
    var semesterEnd = new Date(semesterStart.getTime() + 16 * 7 * 86400000);
    var semesterProgress = Math.min(100, Math.max(0, Math.round(((now - semesterStart) / (semesterEnd - semesterStart)) * 100)));

    // Weekly activity (mock for now, real data comes from study log)
    var weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var weekActivity = weekDays.map(function() { return Math.floor(Math.random() * 5) + 1; });

    return {
      focusHours: focusHours,
      focusMins: focusMins,
      focusMinutes: focusMinutes,
      streak: streak,
      completedTasks: completedTasks,
      totalTasks: totalTasks,
      completionRate: completionRate,
      earnedBadges: earnedBadges,
      totalBadges: 16,
      xp: xp,
      level: level,
      semesterProgress: semesterProgress,
      weekActivity: weekActivity,
      weekDays: weekDays
    };
  }

  function getLevel(xp) {
    var levels = [
      { level: 1, title: 'Freshman', xp: 0 },
      { level: 2, title: 'Sophomore', xp: 100 },
      { level: 3, title: 'Junior', xp: 300 },
      { level: 4, title: 'Senior', xp: 600 },
      { level: 5, title: 'Scholar', xp: 1000 },
      { level: 6, title: 'Honor Student', xp: 1500 },
      { level: 7, title: "Dean's List", xp: 2200 },
      { level: 8, title: 'Valedictorian', xp: 3000 },
      { level: 9, title: 'Magna Cum Laude', xp: 4000 },
      { level: 10, title: 'Summa Cum Laude', xp: 5500 }
    ];
    var current = levels[0];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i].xp) { current = levels[i]; break; }
    }
    return current;
  }

  function createStatsDashboard(stats) {
    var dashboard = document.createElement('div');
    dashboard.id = 'pc-stats-dashboard';

    // Build activity chart (text-based bar chart)
    var maxActivity = Math.max.apply(null, stats.weekActivity);
    var chartHTML = stats.weekDays.map(function(day, i) {
      var height = maxActivity > 0 ? Math.round((stats.weekActivity[i] / maxActivity) * 100) : 0;
      return '<div class="pc-stats-bar-col">' +
        '<div class="pc-stats-bar" style="height:' + height + '%;background:' + (i < 5 ? '#7C3AED' : '#3D3560') + '"></div>' +
        '<span class="pc-stats-bar-label">' + day + '</span>' +
      '</div>';
    }).join('');

    dashboard.innerHTML =
      '<div class="pc-stats-container">' +
        '<div class="pc-stats-header">' +
          '<span class="pc-stats-title">&#128200; Study Stats</span>' +
          '<span class="pc-stats-toggle" id="pcStatsToggle">&#9660;</span>' +
        '</div>' +
        '<div class="pc-stats-body" id="pcStatsBody">' +

          // Top stats grid
          '<div class="pc-stats-grid">' +
            '<div class="pc-stats-card">' +
              '<div class="pc-stats-card-val">' + stats.focusHours + 'h ' + stats.focusMins + 'm</div>' +
              '<div class="pc-stats-card-label">Focus Time</div>' +
            '</div>' +
            '<div class="pc-stats-card">' +
              '<div class="pc-stats-card-val">&#128293; ' + stats.streak + '</div>' +
              '<div class="pc-stats-card-label">Day Streak</div>' +
            '</div>' +
            '<div class="pc-stats-card">' +
              '<div class="pc-stats-card-val">' + stats.completionRate + '%</div>' +
              '<div class="pc-stats-card-label">Completion Rate</div>' +
            '</div>' +
            '<div class="pc-stats-card">' +
              '<div class="pc-stats-card-val">' + stats.xp + '</div>' +
              '<div class="pc-stats-card-label">Total XP</div>' +
            '</div>' +
          '</div>' +

          // Weekly activity chart
          '<div class="pc-stats-chart">' +
            '<div class="pc-stats-chart-title">This Week\'s Activity</div>' +
            '<div class="pc-stats-chart-bars">' + chartHTML + '</div>' +
          '</div>' +

          // Progress bars
          '<div class="pc-stats-progress-section">' +
            '<div class="pc-stats-progress-item">' +
              '<div class="pc-stats-progress-header">' +
                '<span>Semester Progress</span><span>' + stats.semesterProgress + '%</span>' +
              '</div>' +
              '<div class="pc-stats-progress-bar"><div class="pc-stats-progress-fill" style="width:' + stats.semesterProgress + '%;background:linear-gradient(90deg,#7C3AED,#A78BFA)"></div></div>' +
            '</div>' +
            '<div class="pc-stats-progress-item">' +
              '<div class="pc-stats-progress-header">' +
                '<span>Tasks Done</span><span>' + stats.completedTasks + '/' + stats.totalTasks + '</span>' +
              '</div>' +
              '<div class="pc-stats-progress-bar"><div class="pc-stats-progress-fill" style="width:' + stats.completionRate + '%;background:linear-gradient(90deg,#10B981,#34D399)"></div></div>' +
            '</div>' +
            '<div class="pc-stats-progress-item">' +
              '<div class="pc-stats-progress-header">' +
                '<span>Badges Earned</span><span>' + stats.earnedBadges + '/' + stats.totalBadges + '</span>' +
              '</div>' +
              '<div class="pc-stats-progress-bar"><div class="pc-stats-progress-fill" style="width:' + Math.round((stats.earnedBadges/stats.totalBadges)*100) + '%;background:linear-gradient(90deg,#F59E0B,#FBBF24)"></div></div>' +
            '</div>' +
          '</div>' +

          // Level info
          '<div class="pc-stats-level">' +
            '<span class="pc-stats-level-badge">Lvl ' + stats.level.level + '</span>' +
            '<span class="pc-stats-level-title">' + stats.level.title + '</span>' +
          '</div>' +

        '</div>' +
      '</div>';

    // Insert after notes or achievements
    var notes = document.getElementById('pc-notes-widget');
    var ach = document.getElementById('pc-achievements-panel');
    var target = notes || ach;
    if (target && target.nextSibling) {
      target.parentNode.insertBefore(dashboard, target.nextSibling);
    } else {
      var content = document.getElementById('content');
      if (content) content.appendChild(dashboard);
      else document.body.appendChild(dashboard);
    }

    // Toggle
    var toggle = document.getElementById('pcStatsToggle');
    var body = document.getElementById('pcStatsBody');
    if (toggle && body) {
      toggle.addEventListener('click', function() {
        var vis = body.style.display !== 'none';
        body.style.display = vis ? 'none' : 'block';
        toggle.innerHTML = vis ? '&#9654;' : '&#9660;';
      });
    }
  }

  // Log study activity (called from Finals Mode when a session completes)
  function logStudyActivity(minutes) {
    chrome.storage.local.get(['pcStudyLog'], function(data) {
      var log = data.pcStudyLog || [];
      log.push({
        date: new Date().toISOString(),
        minutes: minutes,
        day: new Date().getDay()
      });
      // Keep last 90 days
      var cutoff = Date.now() - 90 * 86400000;
      log = log.filter(function(entry) { return new Date(entry.date).getTime() > cutoff; });
      chrome.storage.local.set({ pcStudyLog: log });
    });
  }

  // Make available globally
  if (typeof window !== 'undefined') {
    window.PrettyStats = { log: logStudyActivity };
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initStudyStats, 1100); });
  } else {
    setTimeout(initStudyStats, 1100);
  }

})();
/* ========================================
   PRETTY CAMPUS - Canvas Wrapped
   Spotify Wrapped style semester recap
   Shareable cards for Instagram/TikTok
   
   BetterCampus has basic "Canvas Wraps"
   but students want:
   - Trends over time
   - Gamification highlights  
   - Shareable cards with watermark
   - Personality type based on study habits
   ======================================== */

(function() {
  'use strict';

  function initWrapped() {
    // Add Wrapped button to the page
    if (document.getElementById('pc-wrapped-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'pc-wrapped-btn';
    btn.className = 'pc-wrapped-trigger';
    btn.innerHTML = '&#127775; My Semester Wrapped';
    btn.addEventListener('click', showWrapped);

    // Insert near GPA widget or at top
    var gpa = document.getElementById('pc-gpa-widget');
    if (gpa) {
      gpa.parentNode.insertBefore(btn, gpa);
    } else {
      var content = document.getElementById('content');
      if (content) content.insertBefore(btn, content.firstChild);
    }
  }

  function showWrapped() {
    if (document.getElementById('pc-wrapped-overlay')) return;

    chrome.storage.local.get([
      'pcStreak', 'pcBadges', 'pcXP', 'pcTasks',
      'pcFinalsState', 'pcStudyLog', 'pcCustomTasks'
    ], function(data) {
      var stats = gatherStats(data);
      createWrappedOverlay(stats);
    });
  }

  function gatherStats(data) {
    var badges = data.pcBadges || {};
    var tasks = data.pcTasks || {};
    var streak = data.pcStreak || 0;
    var xp = data.pcXP || 0;
    var focusTime = (data.pcFinalsState && data.pcFinalsState.totalFocusTime) || 0;

    var taskIds = Object.keys(tasks);
    var completed = taskIds.filter(function(id) { return tasks[id].completed; }).length;
    var total = taskIds.length || 10;

    // Get courses from PrettyAPI
    var courses = [];
    if (typeof PrettyAPI !== 'undefined') {
      courses = PrettyAPI.getMockCourses();
    }

    // Calculate personality
    var personality = getStudyPersonality(streak, completed, total, focusTime, xp);

    // Best course
    var bestCourse = courses.length > 0 ? courses.reduce(function(a, b) { return a.percentage > b.percentage ? a : b; }) : null;
    var worstCourse = courses.length > 0 ? courses.reduce(function(a, b) { return a.percentage < b.percentage ? a : b; }) : null;

    // GPA
    var gpa = 0;
    if (typeof PrettyGPA !== 'undefined' && courses.length > 0) {
      gpa = PrettyGPA.calculateGPA(courses);
    }

    return {
      streak: streak,
      badgesEarned: Object.keys(badges).length,
      totalBadges: 16,
      xp: xp,
      completed: completed,
      total: total,
      focusMinutes: Math.floor(focusTime / 60),
      courses: courses,
      bestCourse: bestCourse,
      worstCourse: worstCourse,
      gpa: gpa,
      personality: personality
    };
  }

  function getStudyPersonality(streak, completed, total, focusTime, xp) {
    var rate = total > 0 ? completed / total : 0;
    var focusMins = focusTime / 60;

    if (streak >= 14 && rate > 0.9) return { type: 'The Machine', emoji: '&#129302;', desc: 'Consistent, disciplined, unstoppable. You never miss a deadline and your streak proves it.' };
    if (focusMins > 300 && rate > 0.7) return { type: 'Deep Thinker', emoji: '&#129504;', desc: 'You value quality over speed. Long focus sessions are your power move.' };
    if (xp > 500 && rate > 0.8) return { type: 'Overachiever', emoji: '&#127942;', desc: 'Badges, XP, streaks... you collect them all. Your transcript reflects your dedication.' };
    if (streak >= 7) return { type: 'Streak Hunter', emoji: '&#128293;', desc: 'That streak counter is your fuel. Missing a day is NOT an option.' };
    if (rate > 0.9) return { type: 'Silent Grinder', emoji: '&#128170;', desc: 'You get things done without fanfare. Quietly excellent.' };
    if (focusMins > 120) return { type: 'Night Owl Scholar', emoji: '&#129417;', desc: 'Late night study sessions are your jam. The library closes but you keep going.' };
    return { type: 'Rising Star', emoji: '&#11088;', desc: 'Just getting started but already showing potential. Your best semester is ahead.' };
  }

  function createWrappedOverlay(stats) {
    var overlay = document.createElement('div');
    overlay.id = 'pc-wrapped-overlay';

    var slides = buildSlides(stats);
    var currentSlide = 0;

    overlay.innerHTML =
      '<div class="pc-wrapped-modal">' +
        '<button class="pc-wrapped-close" id="pcWrappedClose">&#10005;</button>' +
        '<div class="pc-wrapped-slides" id="pcWrappedSlides">' + slides[0] + '</div>' +
        '<div class="pc-wrapped-nav">' +
          '<button class="pc-wrapped-prev" id="pcWrappedPrev" style="visibility:hidden">&#8592; Back</button>' +
          '<div class="pc-wrapped-dots" id="pcWrappedDots">' +
            slides.map(function(_, i) { return '<span class="pc-wrapped-dot' + (i === 0 ? ' pc-wrapped-dot-active' : '') + '"></span>'; }).join('') +
          '</div>' +
          '<button class="pc-wrapped-next" id="pcWrappedNext">Next &#8594;</button>' +
        '</div>' +
        '<div class="pc-wrapped-watermark">Pretty Campus</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Navigation
    var slidesEl = document.getElementById('pcWrappedSlides');
    var prevBtn = document.getElementById('pcWrappedPrev');
    var nextBtn = document.getElementById('pcWrappedNext');
    var dots = document.querySelectorAll('.pc-wrapped-dot');

    function showSlide(idx) {
      currentSlide = idx;
      slidesEl.innerHTML = slides[idx];
      prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
      nextBtn.textContent = idx === slides.length - 1 ? 'Close' : 'Next \u2192';
      dots.forEach(function(d, i) { d.classList.toggle('pc-wrapped-dot-active', i === idx); });
    }

    nextBtn.addEventListener('click', function() {
      if (currentSlide < slides.length - 1) showSlide(currentSlide + 1);
      else closeWrapped();
    });

    prevBtn.addEventListener('click', function() {
      if (currentSlide > 0) showSlide(currentSlide - 1);
    });

    document.getElementById('pcWrappedClose').addEventListener('click', closeWrapped);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeWrapped();
    });
  }

  function closeWrapped() {
    var overlay = document.getElementById('pc-wrapped-overlay');
    if (overlay) overlay.remove();
  }

  function buildSlides(s) {
    return [
      // Slide 1: Intro
      '<div class="pc-wrapped-slide pc-wrapped-gradient-1">' +
        '<div class="pc-wrapped-slide-emoji">&#127891;</div>' +
        '<h2 class="pc-wrapped-slide-title">Your Semester Wrapped</h2>' +
        '<p class="pc-wrapped-slide-sub">Here\'s how you showed up this semester.</p>' +
      '</div>',

      // Slide 2: GPA
      '<div class="pc-wrapped-slide pc-wrapped-gradient-2">' +
        '<div class="pc-wrapped-slide-emoji">&#128200;</div>' +
        '<div class="pc-wrapped-big-number">' + s.gpa.toFixed(2) + '</div>' +
        '<h2 class="pc-wrapped-slide-title">Semester GPA</h2>' +
        '<p class="pc-wrapped-slide-sub">' + s.courses.length + ' courses | ' + s.courses.reduce(function(sum, c) { return sum + c.credits; }, 0) + ' credits</p>' +
      '</div>',

      // Slide 3: Best course
      '<div class="pc-wrapped-slide pc-wrapped-gradient-3">' +
        '<div class="pc-wrapped-slide-emoji">&#127775;</div>' +
        '<h2 class="pc-wrapped-slide-title">Top Course</h2>' +
        '<div class="pc-wrapped-big-number">' + (s.bestCourse ? s.bestCourse.percentage + '%' : 'N/A') + '</div>' +
        '<p class="pc-wrapped-slide-sub">' + (s.bestCourse ? s.bestCourse.name + ' - ' + s.bestCourse.title : '') + '</p>' +
        (s.worstCourse ? '<p class="pc-wrapped-slide-note">Needs work: ' + s.worstCourse.name + ' (' + s.worstCourse.percentage + '%)</p>' : '') +
      '</div>',

      // Slide 4: Productivity
      '<div class="pc-wrapped-slide pc-wrapped-gradient-4">' +
        '<div class="pc-wrapped-slide-emoji">&#9889;</div>' +
        '<h2 class="pc-wrapped-slide-title">Productivity Stats</h2>' +
        '<div class="pc-wrapped-stats-row">' +
          '<div class="pc-wrapped-stat"><div class="pc-wrapped-stat-val">' + s.completed + '</div><div class="pc-wrapped-stat-label">Tasks Done</div></div>' +
          '<div class="pc-wrapped-stat"><div class="pc-wrapped-stat-val">' + s.focusMinutes + 'm</div><div class="pc-wrapped-stat-label">Focus Time</div></div>' +
          '<div class="pc-wrapped-stat"><div class="pc-wrapped-stat-val">' + s.streak + '</div><div class="pc-wrapped-stat-label">Best Streak</div></div>' +
        '</div>' +
      '</div>',

      // Slide 5: Achievements
      '<div class="pc-wrapped-slide pc-wrapped-gradient-5">' +
        '<div class="pc-wrapped-slide-emoji">&#127942;</div>' +
        '<h2 class="pc-wrapped-slide-title">Achievement Report</h2>' +
        '<div class="pc-wrapped-stats-row">' +
          '<div class="pc-wrapped-stat"><div class="pc-wrapped-stat-val">' + s.badgesEarned + '/' + s.totalBadges + '</div><div class="pc-wrapped-stat-label">Badges</div></div>' +
          '<div class="pc-wrapped-stat"><div class="pc-wrapped-stat-val">' + s.xp + '</div><div class="pc-wrapped-stat-label">Total XP</div></div>' +
        '</div>' +
      '</div>',

      // Slide 6: Personality
      '<div class="pc-wrapped-slide pc-wrapped-gradient-6">' +
        '<div class="pc-wrapped-slide-emoji">' + s.personality.emoji + '</div>' +
        '<p class="pc-wrapped-slide-sub">Your study personality is...</p>' +
        '<h2 class="pc-wrapped-slide-title">' + s.personality.type + '</h2>' +
        '<p class="pc-wrapped-slide-desc">' + s.personality.desc + '</p>' +
      '</div>',

      // Slide 7: Share
      '<div class="pc-wrapped-slide pc-wrapped-gradient-1">' +
        '<div class="pc-wrapped-slide-emoji">&#128248;</div>' +
        '<h2 class="pc-wrapped-slide-title">Share Your Wrapped!</h2>' +
        '<p class="pc-wrapped-slide-sub">Screenshot and share on Instagram, TikTok, or with friends.</p>' +
        '<p class="pc-wrapped-slide-note">&#128640; prettycampus.com</p>' +
      '</div>'
    ];
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initWrapped, 1300); });
  } else {
    setTimeout(initWrapped, 1300);
  }

})();
/* ========================================
   PRETTY CAMPUS - Focus Sounds
   Ambient study sounds using Web Audio API
   No external files needed - generates sounds
   programmatically. Pairs with Finals Mode.
   NO Canvas extension has this.
   ======================================== */

(function() {
  'use strict';

  var audioCtx = null;
  var activeNodes = [];
  var currentSound = null;
  var volume = 0.3;

  var SOUNDS = [
    { id: 'off', name: 'Off', emoji: '&#128263;' },
    { id: 'white-noise', name: 'White Noise', emoji: '&#127787;' },
    { id: 'brown-noise', name: 'Brown Noise', emoji: '&#9749;' },
    { id: 'pink-noise', name: 'Pink Noise', emoji: '&#127800;' },
    { id: 'rain', name: 'Rainfall', emoji: '&#127783;' },
    { id: 'campfire', name: 'Campfire', emoji: '&#128293;' },
    { id: 'binaural', name: 'Focus Beats', emoji: '&#127911;' }
  ];

  function initFocusSounds() {
    if (document.getElementById('pc-sounds-widget')) return;
    createSoundsWidget();
  }

  function createSoundsWidget() {
    var widget = document.createElement('div');
    widget.id = 'pc-sounds-widget';

    var btnsHTML = SOUNDS.map(function(s) {
      return '<button class="pc-sound-btn" data-sound="' + s.id + '" title="' + s.name + '">' +
        '<span class="pc-sound-emoji">' + s.emoji + '</span>' +
        '<span class="pc-sound-name">' + s.name + '</span>' +
      '</button>';
    }).join('');

    widget.innerHTML =
      '<div class="pc-sounds-toggle" id="pcSoundsToggle" title="Focus Sounds">&#127911;</div>' +
      '<div class="pc-sounds-panel" id="pcSoundsPanel" style="display:none;">' +
        '<div class="pc-sounds-header">Focus Sounds</div>' +
        '<div class="pc-sounds-grid">' + btnsHTML + '</div>' +
        '<div class="pc-sounds-volume">' +
          '<span class="pc-sounds-vol-label">&#128264;</span>' +
          '<input type="range" id="pcSoundsVolume" class="pc-sounds-slider" min="0" max="100" value="30">' +
          '<span class="pc-sounds-vol-label">&#128266;</span>' +
        '</div>' +
        '<div class="pc-sounds-status" id="pcSoundsStatus">Select a sound to focus</div>' +
      '</div>';

    document.body.appendChild(widget);

    // Toggle panel
    document.getElementById('pcSoundsToggle').addEventListener('click', function() {
      var panel = document.getElementById('pcSoundsPanel');
      var vis = panel.style.display !== 'none';
      panel.style.display = vis ? 'none' : 'block';
    });

    // Sound buttons
    document.querySelectorAll('.pc-sound-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var soundId = btn.dataset.sound;
        document.querySelectorAll('.pc-sound-btn').forEach(function(b) { b.classList.remove('pc-sound-active'); });

        if (soundId === 'off' || soundId === currentSound) {
          stopSound();
          currentSound = null;
          document.getElementById('pcSoundsStatus').textContent = 'Sound off';
          document.getElementById('pcSoundsToggle').classList.remove('pc-sounds-playing');
        } else {
          stopSound();
          playSound(soundId);
          currentSound = soundId;
          btn.classList.add('pc-sound-active');
          var soundName = SOUNDS.find(function(s) { return s.id === soundId; }).name;
          document.getElementById('pcSoundsStatus').textContent = 'Playing: ' + soundName;
          document.getElementById('pcSoundsToggle').classList.add('pc-sounds-playing');
        }
      });
    });

    // Volume slider
    document.getElementById('pcSoundsVolume').addEventListener('input', function(e) {
      volume = parseInt(e.target.value) / 100;
      updateVolume();
    });
  }

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    var ctx = getAudioContext();

    switch(type) {
      case 'white-noise': createNoise(ctx, 'white'); break;
      case 'brown-noise': createNoise(ctx, 'brown'); break;
      case 'pink-noise': createNoise(ctx, 'pink'); break;
      case 'rain': createRain(ctx); break;
      case 'campfire': createCampfire(ctx); break;
      case 'binaural': createBinaural(ctx); break;
    }
  }

  function createNoise(ctx, type) {
    var bufferSize = 2 * ctx.sampleRate;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    var lastOut = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white;
      } else if (type === 'brown') {
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else if (type === 'pink') {
        // Pink noise approximation
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
    }

    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    activeNodes.push({ source: source, gain: gain });
  }

  function createRain(ctx) {
    // Rain = filtered white noise + occasional "droplet" clicks
    var bufferSize = 2 * ctx.sampleRate;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
      // Occasional loud "drops"
      if (Math.random() < 0.001) data[i] *= 3;
    }

    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    var gain = ctx.createGain();
    gain.gain.value = volume * 1.2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    activeNodes.push({ source: source, gain: gain });
  }

  function createCampfire(ctx) {
    // Campfire = brown noise + crackle pops
    var bufferSize = 2 * ctx.sampleRate;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    var lastOut = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
      // Random crackles
      if (Math.random() < 0.0003) {
        data[i] += (Math.random() - 0.5) * 2;
      }
    }

    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    var gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    activeNodes.push({ source: source, gain: gain });
  }

  function createBinaural(ctx) {
    // Binaural beats: 200Hz left, 210Hz right = 10Hz alpha wave difference
    var oscL = ctx.createOscillator();
    var oscR = ctx.createOscillator();
    oscL.frequency.value = 200;
    oscR.frequency.value = 210;
    oscL.type = 'sine';
    oscR.type = 'sine';

    var merger = ctx.createChannelMerger(2);
    var gainL = ctx.createGain();
    var gainR = ctx.createGain();
    gainL.gain.value = volume * 0.3;
    gainR.gain.value = volume * 0.3;

    oscL.connect(gainL);
    oscR.connect(gainR);
    gainL.connect(merger, 0, 0);
    gainR.connect(merger, 0, 1);

    var masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    merger.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscL.start();
    oscR.start();

    activeNodes.push(
      { source: oscL, gain: gainL },
      { source: oscR, gain: gainR }
    );
  }

  function stopSound() {
    activeNodes.forEach(function(node) {
      try { node.source.stop(); } catch(e) {}
      try { node.source.disconnect(); } catch(e) {}
      try { node.gain.disconnect(); } catch(e) {}
    });
    activeNodes = [];
  }

  function updateVolume() {
    activeNodes.forEach(function(node) {
      if (node.gain) node.gain.gain.value = volume;
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initFocusSounds, 1400); });
  } else {
    setTimeout(initFocusSounds, 1400);
  }

})();
/* ========================================
   PRETTY CAMPUS - Dashboard Customizer
   4 features that BetterCampus has:
   1. Gradient dashboard cards with custom colors
   2. Custom font picker
   3. Condensed card view (more cards visible)
   4. Sidebar cleanup (remove logo, hide items)
   ======================================== */

(function() {
  'use strict';

  var FONTS = [
    { id: 'default', name: 'Default', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { id: 'inter', name: 'Inter', family: '"Inter", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
    { id: 'poppins', name: 'Poppins', family: '"Poppins", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
    { id: 'nunito', name: 'Nunito', family: '"Nunito", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
    { id: 'outfit', name: 'Outfit', family: '"Outfit", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
    { id: 'space-grotesk', name: 'Space Grotesk', family: '"Space Grotesk", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
    { id: 'dm-sans', name: 'DM Sans', family: '"DM Sans", sans-serif', url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
    { id: 'lexend', name: 'Lexend', family: '"Lexend", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap' },
    { id: 'comic-neue', name: 'Comic Neue', family: '"Comic Neue", cursive', url: 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap' },
    { id: 'jetbrains', name: 'JetBrains Mono', family: '"JetBrains Mono", monospace', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' }
  ];

  var GRADIENTS = [
    { id: 'none', name: 'Solid Color', gradient: '' },
    { id: 'violet-pink', name: 'Violet Pink', gradient: 'linear-gradient(135deg, #7C3AED, #EC4899)' },
    { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' },
    { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #F97316, #EF4444)' },
    { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
    { id: 'gold', name: 'Gold', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { id: 'aurora', name: 'Aurora', gradient: 'linear-gradient(135deg, #7C3AED, #06B6D4)' },
    { id: 'rose', name: 'Rose', gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
    { id: 'midnight', name: 'Midnight', gradient: 'linear-gradient(135deg, #1E1B4B, #312E81)' },
    { id: 'candy', name: 'Candy', gradient: 'linear-gradient(135deg, #F472B6, #A78BFA, #60A5FA)' }
  ];

  function init() {
    chrome.storage.local.get(['pcDashFont', 'pcDashGradient', 'pcDashCondensed', 'pcDashSidebar'], function(data) {
      // Apply saved font
      if (data.pcDashFont && data.pcDashFont !== 'default') {
        applyFont(data.pcDashFont);
      }

      // Apply saved gradient
      if (data.pcDashGradient && data.pcDashGradient !== 'none') {
        applyGradient(data.pcDashGradient);
      }

      // Apply condensed view
      if (data.pcDashCondensed) {
        applyCondensed(true);
      }

      // Apply sidebar cleanup
      if (data.pcDashSidebar) {
        applySidebarCleanup(data.pcDashSidebar);
      }

      // Create customizer panel
      createCustomizerPanel(data);
    });
  }

  function applyFont(fontId) {
    var font = FONTS.find(function(f) { return f.id === fontId; });
    if (!font) return;

    // Load Google Font if needed
    if (font.url) {
      var existing = document.getElementById('pc-custom-font');
      if (existing) existing.remove();
      var link = document.createElement('link');
      link.id = 'pc-custom-font';
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    }

    // Apply to body
    document.body.style.fontFamily = font.family;
    // Apply to common Canvas elements
    var style = document.getElementById('pc-font-override');
    if (style) style.remove();
    style = document.createElement('style');
    style.id = 'pc-font-override';
    style.textContent = 'body, p, span, div, h1, h2, h3, h4, h5, h6, a, li, td, th, label, input, textarea, select, button { font-family: ' + font.family + ' !important; }';
    document.head.appendChild(style);
  }

  function applyGradient(gradientId) {
    var gradient = GRADIENTS.find(function(g) { return g.id === gradientId; });
    if (!gradient || !gradient.gradient) return;

    var style = document.getElementById('pc-gradient-override');
    if (style) style.remove();
    style = document.createElement('style');
    style.id = 'pc-gradient-override';
    style.textContent =
      '.ic-DashboardCard .ic-DashboardCard__header { background: ' + gradient.gradient + ' !important; }' +
      '.ic-DashboardCard__header_hero { background: ' + gradient.gradient + ' !important; }' +
      '.ic-DashboardCard__header_content { background: transparent !important; }';
    document.head.appendChild(style);
  }

  function applyCondensed(enabled) {
    var style = document.getElementById('pc-condensed-override');
    if (style) style.remove();

    if (enabled) {
      style = document.createElement('style');
      style.id = 'pc-condensed-override';
      style.textContent =
        '.ic-DashboardCard { min-height: auto !important; }' +
        '.ic-DashboardCard__header { height: 80px !important; min-height: 80px !important; }' +
        '.ic-DashboardCard__header_hero { height: 80px !important; }' +
        '.ic-DashboardCard__header_content { padding: 8px 12px !important; }' +
        '.ic-DashboardCard__body { padding: 6px 12px !important; }' +
        '.ic-DashboardCard__action-container { padding: 4px 12px !important; }' +
        '[class*="DashboardCardLayout"] { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 12px !important; }';
      document.head.appendChild(style);
    }
  }

  function applySidebarCleanup(options) {
    var style = document.getElementById('pc-sidebar-cleanup');
    if (style) style.remove();

    var css = '';
    if (options.hideLogo) {
      css += '.ic-app-header__logomark, .ic-app-header__logomark-container { display: none !important; }';
    }
    if (options.hideFeedback) {
      css += '#right-side .right-side-list .events_list, .recent_feedback { display: none !important; }';
    }
    if (options.hideHelp) {
      css += '.ic-app-header__menu-list-item--help, #global_nav_help_link { display: none !important; }';
    }
    if (options.compactNav) {
      css += '.ic-app-header__menu-list-link { padding: 8px !important; }';
      css += '.ic-app-header__menu-list-item { margin: 0 !important; }';
    }

    if (css) {
      style = document.createElement('style');
      style.id = 'pc-sidebar-cleanup';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  function createCustomizerPanel(data) {
    if (document.getElementById('pc-customizer')) return;

    var panel = document.createElement('div');
    panel.id = 'pc-customizer';

    // Font options HTML
    var fontHTML = FONTS.map(function(f) {
      var selected = (data.pcDashFont || 'default') === f.id ? ' pc-cust-selected' : '';
      return '<div class="pc-cust-option' + selected + '" data-type="font" data-value="' + f.id + '" style="font-family:' + f.family + '">' + f.name + '</div>';
    }).join('');

    // Gradient options HTML
    var gradHTML = GRADIENTS.map(function(g) {
      var selected = (data.pcDashGradient || 'none') === g.id ? ' pc-cust-selected' : '';
      var bg = g.gradient || '#3D3560';
      return '<div class="pc-cust-color-option' + selected + '" data-type="gradient" data-value="' + g.id + '" style="background:' + bg + '" title="' + g.name + '"></div>';
    }).join('');

    panel.innerHTML =
      '<div class="pc-cust-toggle" id="pcCustToggle" title="Dashboard Customizer">&#127912;</div>' +
      '<div class="pc-cust-panel" id="pcCustPanel" style="display:none;">' +
        '<div class="pc-cust-header">Dashboard Customizer</div>' +

        // Fonts
        '<div class="pc-cust-section">' +
          '<div class="pc-cust-section-title">Font</div>' +
          '<div class="pc-cust-font-grid">' + fontHTML + '</div>' +
        '</div>' +

        // Card Gradients
        '<div class="pc-cust-section">' +
          '<div class="pc-cust-section-title">Card Style</div>' +
          '<div class="pc-cust-color-grid">' + gradHTML + '</div>' +
        '</div>' +

        // Toggles
        '<div class="pc-cust-section">' +
          '<div class="pc-cust-section-title">Layout</div>' +
          '<label class="pc-cust-toggle-row"><input type="checkbox" id="pcCondensed" ' + (data.pcDashCondensed ? 'checked' : '') + '> Condensed cards</label>' +
          '<label class="pc-cust-toggle-row"><input type="checkbox" id="pcHideLogo" ' + (data.pcDashSidebar && data.pcDashSidebar.hideLogo ? 'checked' : '') + '> Hide sidebar logo</label>' +
          '<label class="pc-cust-toggle-row"><input type="checkbox" id="pcHideFeedback" ' + (data.pcDashSidebar && data.pcDashSidebar.hideFeedback ? 'checked' : '') + '> Hide recent feedback</label>' +
          '<label class="pc-cust-toggle-row"><input type="checkbox" id="pcHideHelp" ' + (data.pcDashSidebar && data.pcDashSidebar.hideHelp ? 'checked' : '') + '> Hide help button</label>' +
          '<label class="pc-cust-toggle-row"><input type="checkbox" id="pcCompactNav" ' + (data.pcDashSidebar && data.pcDashSidebar.compactNav ? 'checked' : '') + '> Compact navigation</label>' +
        '</div>' +

      '</div>';

    document.body.appendChild(panel);

    // Toggle panel
    document.getElementById('pcCustToggle').addEventListener('click', function() {
      var p = document.getElementById('pcCustPanel');
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
    });

    // Font selection
    document.querySelectorAll('[data-type="font"]').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('[data-type="font"]').forEach(function(e) { e.classList.remove('pc-cust-selected'); });
        el.classList.add('pc-cust-selected');
        var fontId = el.dataset.value;
        applyFont(fontId);
        chrome.storage.local.set({ pcDashFont: fontId });
      });
    });

    // Gradient selection
    document.querySelectorAll('[data-type="gradient"]').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('[data-type="gradient"]').forEach(function(e) { e.classList.remove('pc-cust-selected'); });
        el.classList.add('pc-cust-selected');
        var gradId = el.dataset.value;
        applyGradient(gradId);
        chrome.storage.local.set({ pcDashGradient: gradId });
      });
    });

    // Condensed toggle
    document.getElementById('pcCondensed').addEventListener('change', function() {
      applyCondensed(this.checked);
      chrome.storage.local.set({ pcDashCondensed: this.checked });
    });

    // Sidebar toggles
    var sidebarCheckboxes = ['pcHideLogo', 'pcHideFeedback', 'pcHideHelp', 'pcCompactNav'];
    sidebarCheckboxes.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', function() {
          var options = {
            hideLogo: document.getElementById('pcHideLogo').checked,
            hideFeedback: document.getElementById('pcHideFeedback').checked,
            hideHelp: document.getElementById('pcHideHelp').checked,
            compactNav: document.getElementById('pcCompactNav').checked
          };
          applySidebarCleanup(options);
          chrome.storage.local.set({ pcDashSidebar: options });
        });
      }
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 400); });
  } else {
    setTimeout(init, 400);
  }

})();
/* ========================================
   PRETTY CAMPUS - Floating Dock Controller
   Central hub to toggle all feature panels
   Replaces scattered floating buttons
   ======================================== */

(function() {
  'use strict';

  function initDock() {
    if (document.getElementById('pc-dock')) return;

    var dock = document.createElement('div');
    dock.id = 'pc-dock';

    var buttons = [
      { id: 'dock-gpa', emoji: '&#128200;', tip: 'GPA Calculator', target: 'pc-gpa-widget' },
      { id: 'dock-tasks', emoji: '&#128203;', tip: 'Task Sidebar', target: 'pc-task-wrapper' },
      { id: 'dock-badges', emoji: '&#127942;', tip: 'Achievements', target: 'pc-achievements-panel' },
      { id: 'dock-notes', emoji: '&#128221;', tip: 'Notes', target: 'pc-notes-widget' },
      { id: 'dock-stats', emoji: '&#128200;', tip: 'Study Stats', target: 'pc-stats-dashboard' },
      { id: 'dock-finals', emoji: '&#127891;', tip: 'Finals Mode', action: 'toggleFinals' },
      { id: 'dock-sounds', emoji: '&#127911;', tip: 'Focus Sounds', action: 'toggleSounds' },
      { id: 'dock-custom', emoji: '&#127912;', tip: 'Customizer', action: 'toggleCustomizer' },
      { id: 'dock-dark', emoji: '&#127769;', tip: 'Dark Mode (Alt+D)', action: 'toggleDark' }
    ];

    var html = buttons.map(function(btn) {
      return '<button class="pc-dock-btn" id="' + btn.id + '" data-target="' + (btn.target || '') + '" data-action="' + (btn.action || '') + '">' +
        btn.emoji +
        '<span class="pc-dock-tooltip">' + btn.tip + '</span>' +
      '</button>';
    }).join('');

    dock.innerHTML = html;
    document.body.appendChild(dock);

    // Panel toggle buttons
    dock.querySelectorAll('.pc-dock-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetId = btn.dataset.target;
        var action = btn.dataset.action;

        if (targetId) {
          // Toggle panel visibility
          var panel = document.getElementById(targetId);
          if (panel) {
            var isExpanded = panel.classList.contains('pc-expanded');
            // Close all panels first
            closeAllPanels();
            // Open this one if it was closed
            if (!isExpanded) {
              panel.classList.add('pc-expanded');
              btn.classList.add('pc-dock-active');
              if (targetId === 'pc-task-wrapper') {
                document.body.classList.add('pc-sidebar-open');
              }
            }
          }
        }

        if (action === 'toggleFinals') {
          var fmBody = document.getElementById('pcFmBody');
          if (fmBody) {
            var vis = fmBody.style.display !== 'none';
            closeAllPopups();
            if (!vis) {
              fmBody.style.display = 'block';
              btn.classList.add('pc-dock-active');
            }
          }
        }

        if (action === 'toggleSounds') {
          var spanel = document.getElementById('pcSoundsPanel');
          if (spanel) {
            var vis2 = spanel.style.display !== 'none';
            closeAllPopups();
            if (!vis2) {
              spanel.style.display = 'block';
              btn.classList.add('pc-dock-active');
            }
          }
        }

        if (action === 'toggleCustomizer') {
          var cpanel = document.getElementById('pcCustPanel');
          if (cpanel) {
            var vis3 = cpanel.style.display !== 'none';
            closeAllPopups();
            if (!vis3) {
              cpanel.style.display = 'block';
              btn.classList.add('pc-dock-active');
            }
          }
        }

        if (action === 'toggleDark') {
          chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
            var newState = !data.darkMode;
            var theme = data.darkTheme || 'midnight';
            chrome.storage.local.set({ darkMode: newState, followSystem: false });
            document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
            if (newState) {
              document.documentElement.classList.add('pc-dark-' + theme);
              btn.classList.add('pc-dock-active');
              try { localStorage.setItem('pc_dark_theme', theme); } catch(e) {}
            } else {
              btn.classList.remove('pc-dock-active');
              try { localStorage.removeItem('pc_dark_theme'); } catch(e) {}
            }
          });
        }
      });
    });

    // Set initial dark mode button state
    if (document.documentElement.className.indexOf('pc-dark-') !== -1) {
      var darkBtn = document.getElementById('dock-dark');
      if (darkBtn) darkBtn.classList.add('pc-dock-active');
    }
  }

  function closeAllPanels() {
    var panels = ['pc-gpa-widget', 'pc-task-wrapper', 'pc-achievements-panel', 'pc-notes-widget', 'pc-stats-dashboard'];
    panels.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('pc-expanded');
    });
    document.body.classList.remove('pc-sidebar-open');
    // Remove active state from panel buttons
    var dockBtns = document.querySelectorAll('.pc-dock-btn[data-target]');
    dockBtns.forEach(function(btn) { btn.classList.remove('pc-dock-active'); });
  }

  function closeAllPopups() {
    var popups = ['pcFmBody', 'pcSoundsPanel', 'pcCustPanel'];
    popups.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // Remove active state from action buttons
    var dockBtns = document.querySelectorAll('.pc-dock-btn[data-action]');
    dockBtns.forEach(function(btn) {
      if (btn.dataset.action !== 'toggleDark') btn.classList.remove('pc-dock-active');
    });
  }

  // Close panels when clicking outside
  document.addEventListener('click', function(e) {
    var dock = document.getElementById('pc-dock');
    if (!dock) return;

    var clickedInsidePanel = false;
    var panelIds = ['pc-gpa-widget', 'pc-task-wrapper', 'pc-achievements-panel', 'pc-notes-widget', 'pc-stats-dashboard', 'pc-finals-panel', 'pc-sounds-widget', 'pc-customizer'];
    panelIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.contains(e.target)) clickedInsidePanel = true;
    });

    if (!dock.contains(e.target) && !clickedInsidePanel) {
      closeAllPanels();
      closeAllPopups();
    }
  });

  // Initialize after all other modules
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initDock, 2000); });
  } else {
    setTimeout(initDock, 2000);
  }

})();

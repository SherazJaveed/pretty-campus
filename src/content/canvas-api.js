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

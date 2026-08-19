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

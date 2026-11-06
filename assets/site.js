/* #EDIT (10242026): WS1 — new file. Progressive enhancement only; every page works without it.
   1. Pace slider on the home page (same sample month as the app's onboarding PaceVignette).
   2. Notify form: submits to Netlify Forms in place. Without JS the form posts to /thanks/. */
(function () {
  'use strict';

  // ---- 1. Pace slider ----
  var card = document.querySelector('[data-pace]');
  if (card) {
    // Share of the budget spent by the end of each day (index 0 = day 1). Matches PaceVignette.cumulative.
    var CUMULATIVE = [
      0.02, 0.05, 0.08, 0.10, 0.13, 0.17, 0.19, 0.22, 0.34, 0.36,
      0.37, 0.38, 0.40, 0.43, 0.46, 0.49, 0.52, 0.55, 0.58, 0.61,
      0.64, 0.68, 0.72, 0.75, 0.79, 0.83, 0.86, 0.90, 0.93, 0.96
    ];
    var BUDGET = 2400;
    var DAYS = 30;

    var q = function (sel) { return card.querySelector(sel); };
    var input = q('#pace-day');
    var el = {
      status: q('[data-pace-status]'),
      spent: q('[data-pace-spent]'),
      fill: q('[data-pace-fill]'),
      tick: q('[data-pace-tick]'),
      left: q('[data-pace-left]'),
      daysLeft: q('[data-pace-days-left]'),
      limit: q('[data-pace-limit]'),
      avg: q('[data-pace-avg]'),
      dayLabel: q('[data-pace-day-label]'),
      line: q('[data-pace-line]'),
      area: q('[data-pace-area]'),
      today: q('[data-pace-today]'),
      dot: q('[data-pace-dot]')
    };

    var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
    var x = function (day) { return ((day / DAYS) * 600).toFixed(1); };
    var y = function (share) { return (240 - share * 218).toFixed(1); };

    var render = function (day) {
      var share = CUMULATIVE[day - 1];
      var elapsed = day / DAYS;
      var spent = share * BUDGET;
      var left = Math.max(BUDGET - spent, 0);
      var daysLeft = DAYS - day;
      var over = share > 1;
      var ahead = !over && share > elapsed;
      var label = over ? 'Over budget' : (ahead ? 'Ahead of pace' : 'On track');

      card.setAttribute('data-state', over ? 'over' : (ahead ? 'ahead' : 'on'));
      el.status.textContent = label;
      el.spent.textContent = money(spent);
      el.fill.style.width = (Math.min(share, 1) * 100).toFixed(1) + '%';
      el.tick.style.left = (elapsed * 100).toFixed(1) + '%';
      el.left.textContent = money(left);
      el.daysLeft.textContent = String(daysLeft);
      el.limit.textContent = daysLeft > 0 ? money(left / daysLeft) : '—';
      el.avg.textContent = money(spent / day);
      el.dayLabel.textContent = 'Day ' + day + ' of 30';

      var points = ['0,240'];
      for (var d = 1; d <= day; d++) {
        points.push(x(d) + ',' + y(CUMULATIVE[d - 1]));
      }
      var line = points.join(' ');
      el.line.setAttribute('points', line);
      el.area.setAttribute('points', line + ' ' + x(day) + ',240');
      el.today.setAttribute('x1', x(day));
      el.today.setAttribute('x2', x(day));
      el.dot.setAttribute('cx', x(day));
      el.dot.setAttribute('cy', y(share));

      input.setAttribute('aria-valuetext', 'Day ' + day + ' of 30, ' + label + ', ' + money(spent) + ' spent');
    };

    input.addEventListener('input', function () {
      render(Number(input.value));
    });
    render(Number(input.value));
  }

  // ---- 2. Notify form ----
  var form = document.querySelector('form[name="notify"]');
  var status = document.querySelector('[data-notify-status]');
  if (form && status && window.fetch && window.URLSearchParams && window.FormData) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.classList.remove('ok');
      status.textContent = '';

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }
          form.hidden = true;
          status.classList.add('ok');
          status.textContent = "You're on the list. We'll email you when ZeroBased launches.";
        })
        .catch(function () {
          button.disabled = false;
          status.textContent = "That didn't go through. Please try again in a moment.";
        });
    });
  }
})();

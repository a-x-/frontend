/**
 * @file a-x-/common-frontend/yandex-counter-generic /
 * Created: 01.06.14 / 18:57
 */
<!-- Yandex.Metrika counter -->
function yandexCounterGeneric(params) {
    if(!params)return;
    var counterID = +params.id;
    (function (d, w, c) {
        (w[c] = w[c] || []).push(function () {
            try {
                w['yaCounter' + counterID] = new Ya.Metrika(params);
            } catch (e) {
            }
        });

        var n = d.getElementsByTagName("script")[0],
            s = d.createElement("script"),
            f = function () {
                n.parentNode.insertBefore(s, n);
            };
        s.type = "text/javascript";
        s.async = true;
        s.src = (d.location.protocol == "https:" ? "https:" : "http:") + "//mc.yandex.ru/metrika/watch.js";

        if (w.opera == "[object Opera]") {
            d.addEventListener("DOMContentLoaded", f, false);
        } else {
            f();
        }
    })(document, window, "yandex_metrika_callbacks");
}

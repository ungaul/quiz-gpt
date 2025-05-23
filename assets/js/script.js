$(document).ready(function () {
    let userAgent = navigator.userAgent.toLowerCase();
    let isWindowsDesktop = userAgent.includes("windows") && !/mobile|android|iphone|ipad/i.test(userAgent);
    let isLinuxDesktop = userAgent.includes("linux") && !/mobile|android|iphone|ipad/i.test(userAgent);
    let latestReleaseURL = "https://github.com/ungaul/clip-gpt/releases/latest";

    if (isWindowsDesktop) {
        $("#download")
            .attr("href", latestReleaseURL)
            .siblings(".tooltip-text")
            .text("Download for Windows");
    } else if (isLinuxDesktop) {
        $("#download")
            .attr("href", latestReleaseURL)
            .siblings(".tooltip-text")
            .text("Download for Linux");
    } else {
        $(".help-content").prepend(`
            <p class='warning-message'>
                <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512">
                    <path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
                          fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
                    <path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z"
                          fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="32"/>
                    <path d="M256 367.91a20 20 0 1120-20 20 20 0 01-20 20z"/>
                </svg>
                ClipGPT is available for Windows and Linux. Please visit the GitHub release page from a compatible desktop.
            </p>
        `);

        $("#download").click(function (e) {
            e.preventDefault();
            $("#help").addClass("active");
        });
    }

    $("#help-button").click(function () {
        $("#help").toggleClass("active");
    });

    $("#help").click(function (e) {
        if ($(e.target).closest("a").length === 0) {
            $(this).removeClass("active");
        }
    });
});

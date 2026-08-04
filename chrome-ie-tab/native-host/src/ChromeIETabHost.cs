using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Win32;

namespace ChromeIETabHost
{
    internal static class Program
    {
        public const string Version = "1.0.0";
        public const string HostName = "com.nilleylima.chrome_ie_tab";

        [STAThread]
        private static void Main(string[] args)
        {
            // Ensure WebBrowser uses IE11 document mode when possible.
            TrySetBrowserEmulation();

            if (args.Length >= 2 && string.Equals(args[0], "--viewer", StringComparison.OrdinalIgnoreCase))
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new IeViewerForm(args[1]));
                return;
            }

            // Native messaging mode (Chrome launches this process).
            try
            {
                var message = NativeMessaging.ReadMessage();
                if (message == null)
                {
                    NativeMessaging.WriteMessage(new { ok = false, error = "Empty message" });
                    return;
                }

                var action = GetString(message, "action") ?? "open";
                if (string.Equals(action, "ping", StringComparison.OrdinalIgnoreCase))
                {
                    NativeMessaging.WriteMessage(new
                    {
                        ok = true,
                        version = Version,
                        host = HostName,
                        engine = "Trident/WebBrowser"
                    });
                    return;
                }

                if (string.Equals(action, "open", StringComparison.OrdinalIgnoreCase))
                {
                    var url = GetString(message, "url");
                    if (string.IsNullOrWhiteSpace(url))
                    {
                        NativeMessaging.WriteMessage(new { ok = false, error = "Missing url" });
                        return;
                    }

                    if (!IsAllowedUrl(url))
                    {
                        NativeMessaging.WriteMessage(new { ok = false, error = "URL not allowed" });
                        return;
                    }

                    var exe = Application.ExecutablePath;
                    var psi = new ProcessStartInfo
                    {
                        FileName = exe,
                        Arguments = "--viewer \"" + url.Replace("\"", "") + "\"",
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                    NativeMessaging.WriteMessage(new { ok = true, opened = url, version = Version });
                    return;
                }

                NativeMessaging.WriteMessage(new { ok = false, error = "Unknown action: " + action });
            }
            catch (Exception ex)
            {
                try
                {
                    NativeMessaging.WriteMessage(new { ok = false, error = ex.Message });
                }
                catch
                {
                    // ignored
                }
            }
        }

        private static string GetString(object dictObj, string key)
        {
            var dict = dictObj as System.Collections.Generic.Dictionary<string, object>;
            if (dict == null || !dict.ContainsKey(key) || dict[key] == null) return null;
            return Convert.ToString(dict[key]);
        }

        private static bool IsAllowedUrl(string url)
        {
            Uri uri;
            if (!Uri.TryCreate(url, UriKind.Absolute, out uri)) return false;
            return uri.Scheme == Uri.UriSchemeHttp
                || uri.Scheme == Uri.UriSchemeHttps
                || uri.Scheme == Uri.UriSchemeFile;
        }

        private static void TrySetBrowserEmulation()
        {
            try
            {
                var exeName = Path.GetFileName(Application.ExecutablePath);
                // 11001 = IE11 edge mode
                using (var key = Registry.CurrentUser.CreateSubKey(
                    @"Software\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION"))
                {
                    if (key != null) key.SetValue(exeName, 11001, RegistryValueKind.DWord);
                }
            }
            catch
            {
                // Best-effort only.
            }
        }
    }

    internal static class NativeMessaging
    {
        public static object ReadMessage()
        {
            var stdin = Console.OpenStandardInput();
            var lengthBytes = new byte[4];
            var read = stdin.Read(lengthBytes, 0, 4);
            if (read < 4) return null;
            var length = BitConverter.ToInt32(lengthBytes, 0);
            if (length <= 0 || length > 1024 * 1024) return null;

            var buffer = new byte[length];
            var offset = 0;
            while (offset < length)
            {
                var n = stdin.Read(buffer, offset, length - offset);
                if (n <= 0) break;
                offset += n;
            }

            var json = Encoding.UTF8.GetString(buffer, 0, offset);
            var serializer = new JavaScriptSerializer();
            return serializer.DeserializeObject(json);
        }

        public static void WriteMessage(object payload)
        {
            var serializer = new JavaScriptSerializer();
            var json = serializer.Serialize(payload);
            var bytes = Encoding.UTF8.GetBytes(json);
            var stdout = Console.OpenStandardOutput();
            stdout.Write(BitConverter.GetBytes(bytes.Length), 0, 4);
            stdout.Write(bytes, 0, bytes.Length);
            stdout.Flush();
        }
    }

    internal sealed class IeViewerForm : Form
    {
        private readonly WebBrowser _browser;
        private readonly TextBox _address;
        private readonly Button _btnBack;
        private readonly Button _btnForward;
        private readonly Button _btnGo;
        private readonly Button _btnRefresh;
        private readonly Label _status;

        public IeViewerForm(string startUrl)
        {
            Text = "Chrome IE Tab — Internet Explorer";
            Width = 1100;
            Height = 760;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(640, 480);
            Icon = SystemIcons.Application;

            var toolbar = new Panel
            {
                Dock = DockStyle.Top,
                Height = 40,
                Padding = new Padding(6),
                BackColor = Color.FromArgb(240, 240, 240)
            };

            _btnBack = MakeNavButton("←", 0);
            _btnForward = MakeNavButton("→", 36);
            _btnRefresh = MakeNavButton("↻", 72);
            _btnGo = MakeNavButton("Ir", 0);
            _btnGo.Width = 48;
            _btnGo.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            _btnGo.Left = toolbar.Width - 56;
            _btnGo.Top = 6;

            _address = new TextBox
            {
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                Left = 114,
                Top = 8,
                Width = toolbar.Width - 178,
                Height = 24
            };

            toolbar.Controls.Add(_btnBack);
            toolbar.Controls.Add(_btnForward);
            toolbar.Controls.Add(_btnRefresh);
            toolbar.Controls.Add(_address);
            toolbar.Controls.Add(_btnGo);

            _status = new Label
            {
                Dock = DockStyle.Bottom,
                Height = 24,
                TextAlign = ContentAlignment.MiddleLeft,
                Padding = new Padding(8, 0, 0, 0),
                BackColor = Color.FromArgb(245, 245, 245),
                Text = "Trident / IE WebBrowser"
            };

            _browser = new WebBrowser
            {
                Dock = DockStyle.Fill,
                ScriptErrorsSuppressed = true
            };
            _browser.Navigating += (s, e) =>
            {
                _status.Text = "Carregando: " + e.Url;
                _address.Text = e.Url.ToString();
            };
            _browser.DocumentCompleted += (s, e) =>
            {
                _status.Text = "Concluído — " + (_browser.DocumentTitle ?? e.Url.ToString());
                if (_browser.Url != null) _address.Text = _browser.Url.ToString();
                Text = (_browser.DocumentTitle ?? "IE") + " — Chrome IE Tab";
                UpdateNavButtons();
            };
            _browser.CanGoBackChanged += (s, e) => UpdateNavButtons();
            _browser.CanGoForwardChanged += (s, e) => UpdateNavButtons();

            _btnBack.Click += (s, e) => { if (_browser.CanGoBack) _browser.GoBack(); };
            _btnForward.Click += (s, e) => { if (_browser.CanGoForward) _browser.GoForward(); };
            _btnRefresh.Click += (s, e) => _browser.Refresh();
            _btnGo.Click += (s, e) => NavigateAddress();
            _address.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Enter)
                {
                    e.SuppressKeyPress = true;
                    NavigateAddress();
                }
            };
            toolbar.Resize += (s, e) =>
            {
                _btnGo.Left = toolbar.Width - 56;
                _address.Width = Math.Max(100, toolbar.Width - 178);
            };

            Controls.Add(_browser);
            Controls.Add(_status);
            Controls.Add(toolbar);

            Shown += (s, e) =>
            {
                try
                {
                    _browser.Navigate(startUrl);
                    _address.Text = startUrl;
                }
                catch (Exception ex)
                {
                    MessageBox.Show(this, ex.Message, "Chrome IE Tab", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };
        }

        private Button MakeNavButton(string text, int left)
        {
            return new Button
            {
                Text = text,
                Left = 6 + left,
                Top = 6,
                Width = 32,
                Height = 26,
                FlatStyle = FlatStyle.System
            };
        }

        private void NavigateAddress()
        {
            var text = (_address.Text ?? string.Empty).Trim();
            if (text.Length == 0) return;
            if (!text.Contains("://")) text = "http://" + text;
            try
            {
                _browser.Navigate(text);
            }
            catch (Exception ex)
            {
                _status.Text = "Erro: " + ex.Message;
            }
        }

        private void UpdateNavButtons()
        {
            _btnBack.Enabled = _browser.CanGoBack;
            _btnForward.Enabled = _browser.CanGoForward;
        }
    }
}

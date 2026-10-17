// Starts Node.js inside this process (libnode.so from nodejs-mobile). The shape follows nodejs-mobile's own Android test app:
// node::Start() is exported by libnode, its arguments must sit in one contiguous block, and stdout/stderr are sent to logcat.
#include <jni.h>
#include <android/log.h>
#include <pthread.h>
#include <unistd.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

namespace node { extern int Start(int argc, char* argv[]); }

static const char* TAG = "TurboMusicNode";
static int pipes[2][2];

static void* pump(void* arg) {
    const int which = static_cast<int>(reinterpret_cast<intptr_t>(arg));
    const int level = which == 0 ? ANDROID_LOG_INFO : ANDROID_LOG_ERROR;
    char buf[4096];
    ssize_t n;
    while ((n = read(pipes[which][0], buf, sizeof(buf) - 1)) > 0) {
        if (buf[n - 1] == '\n') --n;
        buf[n] = 0;
        __android_log_write(level, TAG, buf);
    }
    return nullptr;
}

static bool redirectOutput() {
    const int targets[2] = {STDOUT_FILENO, STDERR_FILENO};
    for (int i = 0; i < 2; i++) {
        if (pipe(pipes[i]) != 0) return false;
        setvbuf(i == 0 ? stdout : stderr, nullptr, _IONBF, 0);
        dup2(pipes[i][1], targets[i]);
        pthread_t t;
        if (pthread_create(&t, nullptr, pump, reinterpret_cast<void*>(static_cast<intptr_t>(i))) != 0) return false;
        pthread_detach(t);
    }
    return true;
}

static std::string toString(JNIEnv* env, jstring s) {
    const char* c = env->GetStringUTFChars(s, nullptr);
    std::string out(c ? c : "");
    if (c) env->ReleaseStringUTFChars(s, c);
    return out;
}

// Blocks until Node exits. `env` is a list of "NAME=value": Node reads several of them once while it starts, so they are set first.
extern "C" JNIEXPORT jint JNICALL
Java_app_turbomusic_server_NodeHost_run(JNIEnv* env, jobject /* this */, jobjectArray jargs, jobjectArray jenv, jstring jworkDir) {
    for (jsize i = 0, n = env->GetArrayLength(jenv); i < n; i++) {
        const std::string kv = toString(env, static_cast<jstring>(env->GetObjectArrayElement(jenv, i)));
        const auto eq = kv.find('=');
        if (eq != std::string::npos) setenv(kv.substr(0, eq).c_str(), kv.c_str() + eq + 1, 1);
    }
    const std::string work = toString(env, jworkDir);
    if (!work.empty() && chdir(work.c_str()) != 0) __android_log_write(ANDROID_LOG_WARN, TAG, "could not chdir to the working directory");

    // argv in one contiguous block (libuv wants that)
    const jsize argc = env->GetArrayLength(jargs);
    std::string block;
    std::vector<size_t> starts;
    for (jsize i = 0; i < argc; i++) {
        starts.push_back(block.size());
        block += toString(env, static_cast<jstring>(env->GetObjectArrayElement(jargs, i)));
        block.push_back('\0');
    }
    std::vector<char> storage(block.begin(), block.end());
    std::vector<char*> argv;
    for (size_t s : starts) argv.push_back(storage.data() + s);
    argv.push_back(nullptr);

    if (!redirectOutput()) __android_log_write(ANDROID_LOG_ERROR, TAG, "could not send Node's output to logcat");
    return node::Start(argc, argv.data());
}

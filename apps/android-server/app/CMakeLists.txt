cmake_minimum_required(VERSION 3.22.1)
project(turbomusic_server)

# libnode.so: Node.js built as a library for Android (github.com/digidem/nodejs-mobile releases, `full` flavour: it has node:sqlite)
add_library(node SHARED IMPORTED)
set_target_properties(node PROPERTIES IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/libnode/bin/${ANDROID_ABI}/libnode.so)

add_library(node-bridge SHARED src/main/cpp/node-bridge.cpp)
find_library(log-lib log)
target_link_libraries(node-bridge node ${log-lib})

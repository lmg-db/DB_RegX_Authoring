#include <vector>
using namespace std;

class Solution {
public:
    int findPeakElement(vector<int>& nums) {
        // 初始化二分查找的左右边界
        // left指向数组起始位置,right指向数组末尾位置
        int left = 0;
        int right = nums.size() - 1;
        
        // 当左右边界未重合时继续查找
        while (left < right) {
            // 计算中间位置,使用left + (right - left) / 2避免整数溢出
            // 相比(left + right) / 2更安全
            int mid = left + (right - left) / 2;
            
            // 将中点元素与其右侧元素比较
            // 如果中点元素小于右侧元素,说明右半部分一定存在峰值
            // 因为nums[-1] = nums[n] = -∞,所以最右端必定是一个峰值
            if (nums[mid] < nums[mid + 1]) {
                // 将搜索范围缩小到右半部分
                left = mid + 1;
            } else {
                // 如果中点元素大于等于右侧元素
                // 说明峰值可能是当前位置,或在左半部分
                // 将搜索范围缩小到包含当前位置的左半部分
                right = mid;
            }
        }
        
        // 当left和right重合时,就找到了一个峰值
        // 由于题目保证一定存在峰值,该位置必定是一个峰值
        return left;
    }
};